import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '../config/api'
import { Plus, DollarSign, TrendingUp, CheckCircle, TrendingDown, Scale, Landmark, X, Hash, User, Building2, Calendar, FileText, CreditCard, Percent } from 'lucide-react'
import { useToast } from '../context/ToastContext'

const LOAN_INPUT: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid #d1fae5',
  background: '#f0fdf4',
  fontSize: 13.5,
  color: '#1e293b',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'all 0.2s',
}
function loanFocusIn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#059669'
  e.target.style.background = '#fff'
  e.target.style.boxShadow = '0 0 0 3px rgba(5,150,105,0.12)'
}
function loanFocusOut(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#d1fae5'
  e.target.style.background = '#f0fdf4'
  e.target.style.boxShadow = 'none'
}

type Loan = {
  id: number
  loan_account_number: string
  borrower_name: string
  bank_name: string
  loan_amount: string
  total_installments: number
  monthly_installment_amount: string
  interest_rate: string | null
  loan_type: string
  start_date: string
  calculated_end_date: string
  status: string
  notes: string | null
  installments_paid: number
  installments_pending: number
  total_paid: string
  outstanding_balance: string
  created_at: string
}

type Installment = {
  id: number
  loan_id: number
  installment_number: number
  due_date: string
  scheduled_amount: string
  payment_date: string | null
  amount_paid: string | null
  paid_bank: string | null
  payment_description: string | null
  status: string
}

type AmortizationScheduleItem = {
  installmentNumber: number
  dueDate: string
  scheduledPayment: number
  principalPortion: number
  interestPortion: number
  remainingBalance: number
}

export default function Loans() {
  const { toast } = useToast()
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [installments, setInstallments] = useState<Installment[]>([])
  const [amortizationSchedule, setAmortizationSchedule] = useState<AmortizationScheduleItem[]>([])
  const [showAmortization, setShowAmortization] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null)

  // Form states
  const [loanAccountNumber, setLoanAccountNumber] = useState('')
  const [borrowerName, setBorrowerName] = useState('')
  const [bankName, setBankName] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [totalInstallments, setTotalInstallments] = useState('')
  const [monthlyInstallmentAmount, setMonthlyInstallmentAmount] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [loanType, setLoanType] = useState('BUSINESS')
  const [startDate, setStartDate] = useState('')
  const [notes, setNotes] = useState('')

  // Payment form states
  const [paymentDate, setPaymentDate] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [paidBank, setPaidBank] = useState('')
  const [paymentDescription, setPaymentDescription] = useState('')

  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const fetchLoans = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const r = await fetch(`${API_URL}/loans`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (r.ok) {
        const data = await r.json()
        setLoans(data.loans || [])
      }
    } catch (err) {
      console.error('Error fetching loans:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLoans()
  }, [fetchLoans])

  const handleCreateLoan = async () => {
    if (!loanAccountNumber || !borrowerName || !bankName || !loanAmount ||
        !totalInstallments || !monthlyInstallmentAmount || !startDate) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const r = await fetch(`${API_URL}/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          loan_account_number: loanAccountNumber,
          borrower_name: borrowerName,
          bank_name: bankName,
          loan_amount: parseFloat(loanAmount),
          total_installments: parseInt(totalInstallments),
          monthly_installment_amount: parseFloat(monthlyInstallmentAmount),
          interest_rate: interestRate ? parseFloat(interestRate) : null,
          loan_type: loanType,
          start_date: startDate,
          notes: notes || null
        })
      })

      if (r.ok) {
        toast.success('Loan created successfully!')
        setAddModalOpen(false)
        resetForm()
        fetchLoans()
      } else {
        const error = await r.json()
        toast.error(error.error || 'Failed to create loan')
      }
    } catch (err) {
      console.error('Error creating loan:', err)
      toast.error('Error creating loan')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setLoanAccountNumber('')
    setBorrowerName('')
    setBankName('')
    setLoanAmount('')
    setTotalInstallments('')
    setMonthlyInstallmentAmount('')
    setInterestRate('')
    setLoanType('BUSINESS')
    setStartDate('')
    setNotes('')
  }

  const openLoanDetails = async (loan: Loan) => {
    setSelectedLoan(loan)
    setDetailsModalOpen(true)

    // Fetch installments
    try {
      const token = localStorage.getItem('token')
      const r = await fetch(`${API_URL}/loans/${loan.id}/installments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (r.ok) {
        const data = await r.json()
        setInstallments(data.installments || [])
      }

      // Fetch amortization if interest rate exists
      if (loan.interest_rate) {
        const summaryR = await fetch(`${API_URL}/loans/${loan.id}/summary`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (summaryR.ok) {
          const summaryData = await summaryR.json()
          if (summaryData.summary.amortization) {
            setAmortizationSchedule(summaryData.summary.amortization.schedule || [])
          }
        }
      }
    } catch (err) {
      console.error('Error fetching loan details:', err)
    }
  }

  const openPaymentModal = (installment: Installment) => {
    setSelectedInstallment(installment)
    setPaymentDate(new Date().toISOString().split('T')[0])
    setAmountPaid(installment.scheduled_amount)
    setPaidBank(selectedLoan?.bank_name || '')
    setPaymentDescription(`Loan Installment ${installment.installment_number}`)
    setPaymentModalOpen(true)
  }

  const handleRecordPayment = async () => {
    if (!selectedLoan || !selectedInstallment || !paymentDate || !amountPaid) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const r = await fetch(`${API_URL}/loans/${selectedLoan.id}/installments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          installment_number: selectedInstallment.installment_number,
          payment_date: paymentDate,
          amount_paid: parseFloat(amountPaid),
          paid_bank: paidBank,
          payment_description: paymentDescription
        })
      })

      if (r.ok) {
        toast.success('Payment recorded successfully!')
        setPaymentModalOpen(false)
        setSelectedInstallment(null)
        setPaymentDate('')
        setAmountPaid('')
        setPaidBank('')
        setPaymentDescription('')
        // Refresh loan details
        if (selectedLoan) {
          openLoanDetails(selectedLoan)
        }
        fetchLoans()
      } else {
        const error = await r.json()
        toast.error(error.error || 'Failed to record payment')
      }
    } catch (err) {
      console.error('Error recording payment:', err)
      toast.error('Error recording payment')
    } finally {
      setSaving(false)
    }
  }

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = 
      loan.borrower_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.loan_account_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.bank_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'All' || loan.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const totalActiveLoans = loans.filter(l => l.status === 'ACTIVE').length
  const totalOutstanding = loans.reduce((sum, l) => sum + parseFloat(l.outstanding_balance || '0'), 0)
  const totalCompletedLoans = loans.filter(l => l.status === 'PAID_OFF').length

  return (
    <div style={{ width: '100%', display: 'grid', gap: 16 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>Loan Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Track borrowings, installments & repayment schedules</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #065f46, #059669)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.3)', flexShrink: 0 }}
        >
          <Plus size={16} /> Add Loan
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Landmark size={22} color="#059669" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Loans</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#059669', lineHeight: 1.2, marginTop: 2 }}>{totalActiveLoans}</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #fee2e2, #fecaca)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingDown size={22} color="#ef4444" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outstanding</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444', lineHeight: 1.2, marginTop: 2 }}>LKR {totalOutstanding.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={22} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Completed</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#2563eb', lineHeight: 1.2, marginTop: 2 }}>{totalCompletedLoans}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by borrower, account #, or bank..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '9px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13.5, outline: 'none', background: '#f8fafc', color: '#1e293b' }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['All', 'ACTIVE', 'PAID_OFF'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: `1.5px solid ${statusFilter === s ? '#059669' : '#e2e8f0'}`, background: statusFilter === s ? 'rgba(5,150,105,0.08)' : '#f8fafc', color: statusFilter === s ? '#059669' : '#94a3b8' }}>
              {s === 'All' ? 'All' : s === 'ACTIVE' ? 'Active' : 'Paid Off'}
            </button>
          ))}
        </div>
      </div>

      {/* Loans Table */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #d1fae5', borderTopColor: '#059669', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Loading loans...</div>
        </div>
      ) : filteredLoans.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Landmark size={28} color="#059669" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>No loans found</div>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Add your first loan to start tracking repayments</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #065f46, #059669)' }}>
                  {['Account #', 'Borrower', 'Bank', 'Amount', 'Progress', 'Outstanding', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '13px 16px', textAlign: h === 'Amount' || h === 'Outstanding' ? 'right' : h === 'Progress' || h === 'Status' || h === 'Action' ? 'center' : 'left', fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map((loan, idx) => {
                  const progress = loan.total_installments > 0 ? (loan.installments_paid / loan.total_installments) * 100 : 0
                  const isPaidOff = loan.status === 'PAID_OFF' || loan.status === 'COMPLETED'
                  return (
                    <tr
                      key={loan.id}
                      onClick={() => openLoanDetails(loan)}
                      style={{ borderBottom: idx < filteredLoans.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#059669', fontSize: 13 }}>{loan.loan_account_number}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #d1fae5, #6ee7b7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#065f46', flexShrink: 0 }}>
                            {loan.borrower_name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>{loan.borrower_name}</div>
                            <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{loan.loan_type}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569', fontSize: 13 }}>{loan.bank_name}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>LKR {parseFloat(loan.loan_amount).toLocaleString()}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>{loan.installments_paid}/{loan.total_installments}</span>
                          <div style={{ width: 80, height: 5, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', borderRadius: 99, background: isPaidOff ? '#2563eb' : '#059669' }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: isPaidOff ? '#059669' : '#ef4444' }}>LKR {parseFloat(loan.outstanding_balance).toLocaleString()}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', background: isPaidOff ? 'rgba(37,99,235,0.1)' : 'rgba(5,150,105,0.1)', color: isPaidOff ? '#2563eb' : '#059669', border: `1px solid ${isPaidOff ? 'rgba(37,99,235,0.2)' : 'rgba(5,150,105,0.2)'}` }}>
                          {isPaidOff ? 'Paid Off' : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button onClick={e => { e.stopPropagation(); openLoanDetails(loan) }} style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #d1fae5', background: 'rgba(5,150,105,0.06)', color: '#059669', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Loan Modal */}
      {addModalOpen && (
        <>
          <div className="emp-drawer-overlay" onClick={() => { setAddModalOpen(false); resetForm() }} />
          <div className="emp-drawer">

            {/* Header */}
            <div style={{ background: 'linear-gradient(160deg, #052e16 0%, #065f46 55%, #059669 100%)', padding: '24px 24px 20px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -30, left: 30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Loans</div>
                  <div style={{ color: '#fff', fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px' }}>Add New Loan</div>
                </div>
                <button onClick={() => { setAddModalOpen(false); resetForm() }} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: borrowerName ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.1)', border: '2.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', boxShadow: borrowerName ? '0 4px 16px rgba(5,150,105,0.4)' : 'none', transition: 'all 0.3s', flexShrink: 0 }}>
                  {borrowerName ? borrowerName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : <Landmark size={24} color="rgba(255,255,255,0.35)" />}
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: '-0.1px', minHeight: 22 }}>{borrowerName || 'New Loan'}</div>
                  <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, marginTop: 3 }}>{loanAmount ? `LKR ${Number(loanAmount).toLocaleString()}` : bankName || 'No details yet'}</div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="emp-drawer-body">

              {/* Section: Loan Identity */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CreditCard size={13} color="#059669" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Loan Identity</span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      <Hash size={11} color="#94a3b8" /> Loan Account Number *
                    </span>
                    <input value={loanAccountNumber} onChange={e => setLoanAccountNumber(e.target.value)} placeholder="e.g. LN-2024-001" style={{ ...LOAN_INPUT }} onFocus={loanFocusIn} onBlur={loanFocusOut} />
                  </label>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      <User size={11} color="#94a3b8" /> Borrower Name *
                    </span>
                    <input value={borrowerName} onChange={e => setBorrowerName(e.target.value)} placeholder="e.g. John Silva" style={{ ...LOAN_INPUT }} onFocus={loanFocusIn} onBlur={loanFocusOut} />
                  </label>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      <Building2 size={11} color="#94a3b8" /> Bank Name *
                    </span>
                    <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Bank of Ceylon" style={{ ...LOAN_INPUT }} onFocus={loanFocusIn} onBlur={loanFocusOut} />
                  </label>
                </div>

                {/* Loan Type pills */}
                <div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                    <CreditCard size={11} color="#94a3b8" /> Loan Type *
                  </span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {([
                      { value: 'BUSINESS', label: 'Business' },
                      { value: 'EQUIPMENT', label: 'Equipment' },
                      { value: 'WORKING_CAPITAL', label: 'Working Capital' },
                      { value: 'OTHER', label: 'Other' },
                    ] as const).map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setLoanType(t.value)}
                        style={{
                          padding: '8px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                          border: `1.5px solid ${loanType === t.value ? '#059669' : '#e2e8f0'}`,
                          background: loanType === t.value ? 'rgba(5,150,105,0.1)' : '#f8fafc',
                          color: loanType === t.value ? '#059669' : '#94a3b8',
                          boxShadow: loanType === t.value ? '0 0 0 3px rgba(5,150,105,0.12)' : 'none'
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: 'linear-gradient(to right, #d1fae5, transparent)', marginBottom: 24 }} />

              {/* Section: Financial Details */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <DollarSign size={13} color="#059669" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Financial Details</span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      <DollarSign size={11} color="#94a3b8" /> Loan Amount (LKR) *
                    </span>
                    <input type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} placeholder="0.00" style={{ ...LOAN_INPUT }} onFocus={loanFocusIn} onBlur={loanFocusOut} />
                  </label>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      <TrendingDown size={11} color="#94a3b8" /> Monthly Installment (LKR) *
                    </span>
                    <input type="number" value={monthlyInstallmentAmount} onChange={e => setMonthlyInstallmentAmount(e.target.value)} placeholder="0.00" style={{ ...LOAN_INPUT }} onFocus={loanFocusIn} onBlur={loanFocusOut} />
                  </label>
                </div>

                <div>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      <Percent size={11} color="#94a3b8" /> Interest Rate (% p.a.) <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                    </span>
                    <input type="number" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="e.g. 8.5" style={{ ...LOAN_INPUT }} onFocus={loanFocusIn} onBlur={loanFocusOut} />
                  </label>
                </div>
              </div>

              <div style={{ height: 1, background: 'linear-gradient(to right, #d1fae5, transparent)', marginBottom: 24 }} />

              {/* Section: Schedule */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={13} color="#059669" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Schedule</span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      <Hash size={11} color="#94a3b8" /> Total Installments *
                    </span>
                    <input type="number" value={totalInstallments} onChange={e => setTotalInstallments(e.target.value)} placeholder="e.g. 36" style={{ ...LOAN_INPUT }} onFocus={loanFocusIn} onBlur={loanFocusOut} />
                  </label>
                </div>

                <div>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      <Calendar size={11} color="#94a3b8" /> Start Date *
                    </span>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...LOAN_INPUT }} onFocus={loanFocusIn} onBlur={loanFocusOut} />
                  </label>
                </div>
              </div>

              <div style={{ height: 1, background: 'linear-gradient(to right, #d1fae5, transparent)', marginBottom: 24 }} />

              {/* Section: Notes */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={13} color="#059669" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Notes</span>
                </div>
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                    <FileText size={11} color="#94a3b8" /> Additional Notes <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                  </span>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any additional information about this loan..." style={{ ...LOAN_INPUT, resize: 'vertical' }} onFocus={loanFocusIn} onBlur={loanFocusOut} />
                </label>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fff', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button type="button" onClick={() => { setAddModalOpen(false); resetForm() }} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={handleCreateLoan} disabled={saving} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #065f46, #059669)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
                {saving ? 'Creating...' : '+ Create Loan'}
              </button>
            </div>

          </div>
        </>
      )}

      {/* Loan Details Modal */}
      {detailsModalOpen && selectedLoan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20, overflowY: 'auto' }} onClick={() => setDetailsModalOpen(false)}>
          <div style={{ width: 'min(1100px, 96vw)', background: '#fff', borderRadius: 20, overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(160deg, #052e16 0%, #065f46 55%, #059669 100%)', padding: '24px 28px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -20, left: 20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', border: '2.5px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {selectedLoan.borrower_name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Loan Details</div>
                    <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>{selectedLoan.borrower_name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5, marginTop: 2, fontFamily: 'monospace' }}>{selectedLoan.loan_account_number}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ padding: '5px 12px', borderRadius: 99, background: selectedLoan.status === 'ACTIVE' ? 'rgba(16,185,129,0.25)' : 'rgba(37,99,235,0.25)', color: selectedLoan.status === 'ACTIVE' ? '#6ee7b7' : '#93c5fd', fontSize: 12, fontWeight: 700, border: `1px solid ${selectedLoan.status === 'ACTIVE' ? 'rgba(16,185,129,0.4)' : 'rgba(37,99,235,0.4)'}` }}>
                    {selectedLoan.status === 'ACTIVE' ? 'Active' : 'Paid Off'}
                  </span>
                  <button onClick={() => setDetailsModalOpen(false)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {([
                  { label: 'Bank', value: selectedLoan.bank_name, color: '#0f172a' },
                  { label: 'Loan Type', value: selectedLoan.loan_type, color: '#059669' },
                  { label: 'Loan Amount', value: `LKR ${parseFloat(selectedLoan.loan_amount).toLocaleString()}`, color: '#0f172a' },
                  { label: 'Monthly Installment', value: `LKR ${parseFloat(selectedLoan.monthly_installment_amount).toLocaleString()}`, color: '#0f172a' },
                  { label: 'Total Paid', value: `LKR ${parseFloat(selectedLoan.total_paid).toLocaleString()}`, color: '#059669' },
                  { label: 'Outstanding', value: `LKR ${parseFloat(selectedLoan.outstanding_balance).toLocaleString()}`, color: '#ef4444' },
                  { label: 'Paid / Total', value: `${selectedLoan.installments_paid} / ${selectedLoan.total_installments}`, color: '#0f172a' },
                  { label: 'Remaining', value: `${selectedLoan.installments_pending} installments`, color: '#f59e0b' },
                  ...(selectedLoan.interest_rate ? [{ label: 'Interest Rate', value: `${selectedLoan.interest_rate}% p.a.`, color: '#7c3aed' }] : []),
                  { label: 'Start Date', value: new Date(selectedLoan.start_date).toLocaleDateString(), color: '#0f172a' },
                  { label: 'End Date', value: new Date(selectedLoan.calculated_end_date).toLocaleDateString(), color: '#0f172a' },
                ] as { label: string; value: string; color: string }[]).map(item => (
                  <div key={item.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{item.label}</div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Repayment Progress */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Repayment Progress</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
                    {selectedLoan.total_installments > 0 ? Math.round((selectedLoan.installments_paid / selectedLoan.total_installments) * 100) : 0}%
                  </span>
                </div>
                <div style={{ height: 10, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ width: `${selectedLoan.total_installments > 0 ? (selectedLoan.installments_paid / selectedLoan.total_installments) * 100 : 0}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #059669, #10b981)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{selectedLoan.installments_paid} paid</span>
                  <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{selectedLoan.installments_pending} remaining</span>
                </div>
              </div>

              {/* Amortization Schedule */}
              {selectedLoan.interest_rate && amortizationSchedule.length > 0 && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                  <button onClick={() => setShowAmortization(!showAmortization)} style={{ width: '100%', padding: '14px 20px', background: showAmortization ? 'rgba(5,150,105,0.06)' : '#fff', border: 'none', borderBottom: showAmortization ? '1px solid #e2e8f0' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, color: '#059669', fontSize: 13.5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={15} /> Amortization Schedule</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{showAmortization ? 'Hide ▲' : 'Show ▼'}</span>
                  </button>
                  {showAmortization && (
                    <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                            {['#', 'Due Date', 'Payment', 'Principal', 'Interest', 'Balance'].map((h, i) => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: i >= 2 ? 'right' : 'left', fontWeight: 700, color: '#64748b', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {amortizationSchedule.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 600, color: '#475569' }}>{item.installmentNumber}</td>
                              <td style={{ padding: '10px 14px', color: '#64748b' }}>{new Date(item.dueDate).toLocaleDateString()}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>LKR {item.scheduledPayment.toLocaleString()}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', color: '#059669' }}>LKR {item.principalPortion.toLocaleString()}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', color: '#f59e0b' }}>LKR {item.interestPortion.toLocaleString()}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>LKR {item.remainingBalance.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Installment History */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={13} color="#059669" />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Installment History</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['#', 'Due Date', 'Scheduled', 'Paid On', 'Paid', 'Bank', 'Status', 'Action'].map((h, i) => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: i === 2 || i === 4 ? 'right' : i === 6 || i === 7 ? 'center' : 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map((inst, idx) => (
                        <tr key={inst.id} style={{ borderBottom: idx < installments.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: '#475569' }}>{inst.installment_number}</td>
                          <td style={{ padding: '11px 14px', color: '#64748b' }}>{new Date(inst.due_date).toLocaleDateString()}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>LKR {parseFloat(inst.scheduled_amount).toLocaleString()}</td>
                          <td style={{ padding: '11px 14px', color: '#64748b' }}>{inst.payment_date ? new Date(inst.payment_date).toLocaleDateString() : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 600, color: inst.amount_paid ? '#059669' : '#94a3b8' }}>{inst.amount_paid ? `LKR ${parseFloat(inst.amount_paid).toLocaleString()}` : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                          <td style={{ padding: '11px 14px', color: '#64748b' }}>{inst.paid_bank || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: inst.status === 'PAID' ? 'rgba(5,150,105,0.1)' : 'rgba(245,158,11,0.1)', color: inst.status === 'PAID' ? '#059669' : '#f59e0b', border: `1px solid ${inst.status === 'PAID' ? 'rgba(5,150,105,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                              {inst.status === 'PAID' ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                            {inst.status !== 'PAID' && (
                              <button onClick={() => openPaymentModal(inst)} style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid rgba(5,150,105,0.3)', background: 'rgba(5,150,105,0.07)', color: '#059669', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                Pay
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Recording Modal */}
      {paymentModalOpen && selectedInstallment && selectedLoan && (
        <>
          <div className="emp-drawer-overlay" style={{ zIndex: 1100 }} onClick={() => setPaymentModalOpen(false)} />
          <div className="emp-drawer" style={{ zIndex: 1101 }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(160deg, #052e16 0%, #065f46 55%, #059669 100%)', padding: '24px 24px 20px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Loans — {selectedLoan.loan_account_number}</div>
                  <div style={{ color: '#fff', fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px' }}>Record Payment</div>
                </div>
                <button onClick={() => setPaymentModalOpen(false)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', border: '2.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {selectedInstallment.installment_number}
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>Installment #{selectedInstallment.installment_number}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 3 }}>
                    Due: {new Date(selectedInstallment.due_date).toLocaleDateString()} · LKR {parseFloat(selectedInstallment.scheduled_amount).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="emp-drawer-body">
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                    <Calendar size={11} color="#94a3b8" /> Payment Date *
                  </span>
                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} style={{ ...LOAN_INPUT }} onFocus={loanFocusIn} onBlur={loanFocusOut} />
                </label>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                    <DollarSign size={11} color="#94a3b8" /> Amount Paid (LKR) *
                  </span>
                  <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} style={{ ...LOAN_INPUT }} onFocus={loanFocusIn} onBlur={loanFocusOut} />
                </label>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                    <Building2 size={11} color="#94a3b8" /> Paid to Bank
                  </span>
                  <input value={paidBank} onChange={e => setPaidBank(e.target.value)} style={{ ...LOAN_INPUT }} onFocus={loanFocusIn} onBlur={loanFocusOut} />
                </label>
              </div>
              <div>
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                    <FileText size={11} color="#94a3b8" /> Description
                  </span>
                  <textarea value={paymentDescription} onChange={e => setPaymentDescription(e.target.value)} rows={3} style={{ ...LOAN_INPUT, resize: 'vertical' }} onFocus={loanFocusIn} onBlur={loanFocusOut} />
                </label>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fff', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button type="button" onClick={() => setPaymentModalOpen(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={handleRecordPayment} disabled={saving} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #065f46, #059669)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
                {saving ? 'Recording...' : '✓ Record Payment'}
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
