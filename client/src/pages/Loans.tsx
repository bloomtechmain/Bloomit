import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '../config/api'
import { Plus, DollarSign, TrendingUp, CheckCircle } from 'lucide-react'
import { useToast } from '../context/ToastContext'

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ marginTop: 0, fontSize: 28 }}>Loan Tracker</h1>
        <button 
          onClick={() => setAddModalOpen(true)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            padding: '10px 20px', 
            borderRadius: 8, 
            border: 'none', 
            background: 'var(--primary)', 
            color: '#fff', 
            fontSize: '14px', 
            fontWeight: 600, 
            cursor: 'pointer' 
          }}
        >
          <Plus size={16} />
          <span>Add Loan</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
        <div className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0, 123, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} color="#007bff" />
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#666', fontWeight: 600 }}>Active Loans</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>{totalActiveLoans}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255, 87, 34, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} color="#ff5722" />
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#666', fontWeight: 600 }}>Outstanding Balance</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>LKR {totalOutstanding.toLocaleString()}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 20, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(76, 175, 80, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} color="#4caf50" />
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#666', fontWeight: 600 }}>Completed Loans</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#333' }}>{totalCompletedLoans}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#f8f9fa', padding: 12, borderRadius: 8 }}>
        <input 
          type="text"
          placeholder="Search by borrower, account #, or bank..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
        />
        <select 
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
        >
          <option value="All">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="PAID_OFF">Paid Off</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Loans Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>Loading loans...</div>
      ) : filteredLoans.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', background: '#f5f5f5', borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>💰</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>No loans found</div>
          <p style={{ color: '#666', marginTop: 8 }}>Create your first loan to get started</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="glass-panel" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Account #</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Borrower</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Bank</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Loan Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Installments</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Outstanding</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map((loan, idx) => (
                <tr 
                  key={loan.id}
                  style={{ 
                    borderBottom: idx < filteredLoans.length - 1 ? '1px solid #e0e0e0' : 'none',
                    cursor: 'pointer'
                  }}
                  onClick={() => openLoanDetails(loan)}
                >
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{loan.loan_account_number}</td>
                  <td style={{ padding: '12px 16px' }}>{loan.borrower_name}</td>
                  <td style={{ padding: '12px 16px' }}>{loan.bank_name}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                    LKR {parseFloat(loan.loan_amount).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ fontSize: 13 }}>
                      {loan.installments_paid}/{loan.total_installments}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#ff5722' }}>
                    LKR {parseFloat(loan.outstanding_balance).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: 4, 
                      fontSize: 12, 
                      fontWeight: 600,
                      background: loan.status === 'ACTIVE' ? '#e3f2fd' : '#e8f5e9',
                      color: loan.status === 'ACTIVE' ? '#1976d2' : '#4caf50'
                    }}>
                      {loan.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        openLoanDetails(loan)
                      }}
                      style={{ 
                        padding: '6px 12px', 
                        borderRadius: 6, 
                        border: '1px solid #2196F3', 
                        background: '#2196F3', 
                        color: '#fff', 
                        cursor: 'pointer', 
                        fontSize: 12, 
                        fontWeight: 600 
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Loan Modal */}
      {addModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20 }} onClick={() => setAddModalOpen(false)}>
          <div className="glass-panel" style={{ width: 'min(800px, 96vw)', maxHeight: '90vh', padding: 24, borderRadius: 16, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Add New Loan</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontWeight: 500 }}>Loan Account Number *</label>
                <input value={loanAccountNumber} onChange={e => setLoanAccountNumber(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontWeight: 500 }}>Borrower Name *</label>
                <input value={borrowerName} onChange={e => setBorrowerName(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontWeight: 500 }}>Bank Name *</label>
                <input value={bankName} onChange={e => setBankName(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontWeight: 500 }}>Loan Amount (LKR) *</label>
                <input type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontWeight: 500 }}>Total Installments *</label>
                <input type="number" value={totalInstallments} onChange={e => setTotalInstallments(e.target.value)} placeholder="e.g., 30" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontWeight: 500 }}>Monthly Installment Amount (LKR) *</label>
                <input type="number" value={monthlyInstallmentAmount} onChange={e => setMonthlyInstallmentAmount(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontWeight: 500 }}>Interest Rate (% per annum) - Optional</label>
                <input type="number" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="e.g., 8.5" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontWeight: 500 }}>Loan Type *</label>
                <select value={loanType} onChange={e => setLoanType(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }}>
                  <option value="BUSINESS">Business</option>
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="WORKING_CAPITAL">Working Capital</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
                <label style={{ fontWeight: 500 }}>Start Date *</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
                <label style={{ fontWeight: 500 }}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => { setAddModalOpen(false); resetForm() }} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
              <button onClick={handleCreateLoan} disabled={saving} className="btn-primary" style={{ padding: '10px 20px' }}>{saving ? 'Creating...' : 'Create Loan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Loan Details Modal */}
      {detailsModalOpen && selectedLoan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20, overflowY: 'auto' }} onClick={() => setDetailsModalOpen(false)}>
          <div className="glass-panel" style={{ width: 'min(1200px, 96vw)', maxHeight: '90vh', padding: 24, borderRadius: 16, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: 8 }}>Loan Details</h2>
                <div style={{ fontSize: 14, color: '#666' }}>Account: {selectedLoan.loan_account_number}</div>
              </div>
              <button onClick={() => setDetailsModalOpen(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Close</button>
            </div>

            {/* Loan Information */}
            <div className="glass-card" style={{ padding: 20, marginBottom: 20, borderRadius: 12 }}>
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>Loan Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Borrower</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedLoan.borrower_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Bank</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedLoan.bank_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Loan Amount</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>LKR {parseFloat(selectedLoan.loan_amount).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Monthly Installment</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>LKR {parseFloat(selectedLoan.monthly_installment_amount).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Total Installments</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedLoan.total_installments}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Installments Paid</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#4caf50' }}>{selectedLoan.installments_paid}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Installments Remaining</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#ff5722' }}>{selectedLoan.installments_pending}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Total Amount Paid</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#4caf50' }}>LKR {parseFloat(selectedLoan.total_paid).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Outstanding Balance</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#ff5722' }}>LKR {parseFloat(selectedLoan.outstanding_balance).toLocaleString()}</div>
                </div>
                {selectedLoan.interest_rate && (
                  <div>
                    <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Interest Rate</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedLoan.interest_rate}% p.a.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Amortization Schedule (if interest rate exists) */}
            {selectedLoan.interest_rate && amortizationSchedule.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <button 
                  onClick={() => setShowAmortization(!showAmortization)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #2196F3', background: showAmortization ? '#2196F3' : '#fff', color: showAmortization ? '#fff' : '#2196F3', cursor: 'pointer', fontWeight: 600, marginBottom: 12 }}
                >
                  {showAmortization ? 'Hide' : 'Show'} Amortization Schedule
                </button>
                
                {showAmortization && (
                  <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead style={{ position: 'sticky', top: 0, background: 'var(--primary)', color: '#fff' }}>
                        <tr>
                          <th style={{ padding: '10px 12px', textAlign: 'left' }}>Installment</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left' }}>Due Date</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Payment</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Principal</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Interest</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {amortizationSchedule.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                            <td style={{ padding: '10px 12px' }}>{item.installmentNumber}</td>
                            <td style={{ padding: '10px 12px' }}>{new Date(item.dueDate).toLocaleDateString()}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>LKR {item.scheduledPayment.toLocaleString()}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>LKR {item.principalPortion.toLocaleString()}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>LKR {item.interestPortion.toLocaleString()}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>LKR {item.remainingBalance.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Installments Table */}
            <h3 style={{ marginBottom: 16 }}>Installment History</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>#</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Due Date</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Scheduled Amount</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Payment Date</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount Paid</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Paid Bank</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((inst, idx) => (
                    <tr key={inst.id} style={{ borderBottom: idx < installments.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{inst.installment_number}</td>
                      <td style={{ padding: '10px 12px' }}>{new Date(inst.due_date).toLocaleDateString()}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>LKR {parseFloat(inst.scheduled_amount).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px' }}>{inst.payment_date ? new Date(inst.payment_date).toLocaleDateString() : '-'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{inst.amount_paid ? `LKR ${parseFloat(inst.amount_paid).toLocaleString()}` : '-'}</td>
                      <td style={{ padding: '10px 12px' }}>{inst.paid_bank || '-'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: 4, 
                          fontSize: 11, 
                          fontWeight: 600,
                          background: inst.status === 'PAID' ? '#e8f5e9' : '#fff3e0',
                          color: inst.status === 'PAID' ? '#4caf50' : '#ff9800'
                        }}>
                          {inst.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {inst.status !== 'PAID' && (
                          <button 
                            onClick={() => openPaymentModal(inst)}
                            style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid #4caf50', background: '#4caf50', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          >
                            Record Payment
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
      )}

      {/* Payment Recording Modal */}
      {paymentModalOpen && selectedInstallment && selectedLoan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1100, padding: 20 }} onClick={() => setPaymentModalOpen(false)}>
          <div className="glass-panel" style={{ width: 'min(500px, 96vw)', padding: 24, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Record Payment</h2>
            <p style={{ margin: '0 0 20px', color: '#666' }}>Installment #{selectedInstallment.installment_number}</p>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontWeight: 500 }}>Payment Date *</label>
                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontWeight: 500 }}>Amount Paid (LKR) *</label>
                <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontWeight: 500 }}>Paid to Bank</label>
                <input value={paidBank} onChange={e => setPaidBank(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontWeight: 500 }}>Description</label>
                <textarea value={paymentDescription} onChange={e => setPaymentDescription(e.target.value)} rows={3} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setPaymentModalOpen(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
              <button onClick={handleRecordPayment} disabled={saving} className="btn-primary" style={{ padding: '10px 20px' }}>{saving ? 'Recording...' : 'Record Payment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
