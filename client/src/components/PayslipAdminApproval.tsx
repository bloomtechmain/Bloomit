import { useState, useEffect } from 'react'
import { UserCheck, XCircle, Eye, Calendar, DollarSign, User, Building2, FileText, Clock, AlertCircle, CheckCircle, Shield } from 'lucide-react'
import { getAllPayslips, getPayslipById, adminApprove, rejectPayslip } from '../services/payrollService'
import type { Payslip, PayslipWithSignatures } from '../types/payroll'
import { truncateSignatureHash } from '../utils/signatureHashGenerator'
import { useToast } from '../context/ToastContext'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const card: React.CSSProperties = {
  background: '#fff',
  border: '1.5px solid #e2e8f0',
  borderRadius: 12,
  padding: 24,
  boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount)

export default function PayslipAdminApproval() {
  const { toast } = useToast()
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipWithSignatures | null>(null)
  const [viewingPayslip, setViewingPayslip] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadPayslips() }, [])

  const loadPayslips = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getAllPayslips({ status: 'PENDING_ADMIN_APPROVAL' })
      setPayslips(response.payslips)
    } catch {
      setError('Failed to load payslips for approval')
    } finally {
      setLoading(false)
    }
  }

  const handleViewPayslip = async (payslipId: number) => {
    try {
      setError(null)
      const data = await getPayslipById(payslipId)
      setSelectedPayslip(data)
      setViewingPayslip(true)
    } catch {
      setError('Failed to load payslip details')
    }
  }

  const handleApprove = async () => {
    if (!selectedPayslip) return
    try {
      setProcessing(true)
      setError(null)
      await adminApprove(selectedPayslip.payslip.payslip_id)
      toast.success('Payslip approved! Employee will be notified via email.')
      setViewingPayslip(false)
      setSelectedPayslip(null)
      await loadPayslips()
    } catch {
      setError('Failed to approve payslip')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedPayslip || !rejectionReason.trim()) { setError('Please provide a reason for rejection'); return }
    try {
      setProcessing(true)
      setError(null)
      await rejectPayslip(selectedPayslip.payslip.payslip_id, rejectionReason)
      toast.success('Payslip rejected and sent back for revision')
      setShowRejectModal(false)
      setRejectionReason('')
      setViewingPayslip(false)
      setSelectedPayslip(null)
      await loadPayslips()
    } catch {
      setError('Failed to reject payslip')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div style={{ ...card, padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Loading payslips for approval...</p>
      </div>
    )
  }

  if (viewingPayslip && selectedPayslip) {
    const payslip = selectedPayslip.payslip
    const signatures = selectedPayslip.signatures

    return (
      <div style={{ display: 'grid', gap: 20 }}>
        {error && (
          <div style={{ padding: '12px 16px', background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: 10, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
            <AlertCircle size={15} /><span>{error}</span>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Final Approval</h2>
              <span style={{ padding: '3px 10px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', borderRadius: 6, fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Shield size={11} />ADMIN
              </span>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Payslip #{payslip.payslip_id} — {MONTHS[payslip.payslip_month - 1]} {payslip.payslip_year}</p>
          </div>
          <button
            onClick={() => { setViewingPayslip(false); setSelectedPayslip(null); setError(null) }}
            style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: '#64748b', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0' }}
          >
            ← Back to List
          </button>
        </div>

        {/* Employee Information */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={13} color="#3b82f6" />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Employee Information</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              { label: 'Employee Name', value: `${payslip.first_name} ${payslip.last_name}` },
              { label: 'Employee Number', value: payslip.employee_number },
              { label: 'Department', value: payslip.employee_department || 'N/A' },
              { label: 'Designation', value: payslip.designation || 'N/A' },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Previous Approvals */}
        <div style={{ ...card, border: '1.5px solid #bfdbfe', background: '#f8fbff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={13} color="#3b82f6" />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Previous Approvals</span>
          </div>
          {signatures.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {signatures.map(sig => (
                <div key={sig.signature_id} style={{ padding: '12px 14px', background: '#fff', borderRadius: 9, borderLeft: '4px solid #22c55e', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: '#1e293b' }}>{sig.signer_name}</span>
                      <span style={{ padding: '2px 8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, fontSize: 11.5, fontWeight: 700, color: '#166534' }}>
                        ✓ {sig.signer_role.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />{new Date(sig.signed_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', fontFamily: 'monospace', background: '#f8fafc', padding: '6px 8px', borderRadius: 5 }}>
                    {truncateSignatureHash(sig.signature_hash, 10)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 13.5, fontStyle: 'italic' }}>No previous signatures found</p>
          )}
        </div>

        {/* Salary Details */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={13} color="#f59e0b" />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Salary Breakdown</span>
          </div>
          <div style={{ display: 'grid', gap: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b', fontSize: 13.5 }}>Basic Salary</span>
              <span style={{ fontWeight: 600, color: '#1e293b' }}>{formatCurrency(payslip.basic_salary)}</span>
            </div>

            {Object.keys(payslip.allowances || {}).length > 0 && (
              <div style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allowances</div>
                {Object.entries(payslip.allowances).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0 5px 12px' }}>
                    <span style={{ color: '#64748b', fontSize: 13, textTransform: 'capitalize' }}>{key}</span>
                    <span style={{ fontWeight: 500, fontSize: 13, color: '#059669' }}>{formatCurrency(Number(value))}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '2px solid #e2e8f0' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>Gross Salary</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#3b82f6' }}>{formatCurrency(payslip.gross_salary)}</span>
            </div>

            <div style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deductions</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0 5px 12px' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>EPF Employee ({payslip.epf_employee_rate}%)</span>
                <span style={{ fontWeight: 500, fontSize: 13, color: '#ef4444' }}>{formatCurrency(payslip.epf_employee_deduction)}</span>
              </div>
              {Object.entries(payslip.other_deductions || {}).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0 5px 12px' }}>
                  <span style={{ color: '#64748b', fontSize: 13, textTransform: 'capitalize' }}>{key}</span>
                  <span style={{ fontWeight: 500, fontSize: 13, color: '#ef4444' }}>{formatCurrency(Number(value))}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b' }}>Total Deductions</span>
              <span style={{ fontWeight: 700, fontSize: 13.5, color: '#ef4444' }}>{formatCurrency(payslip.total_deductions)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 18, background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', borderRadius: 10, marginTop: 8, border: '1px solid #bbf7d0' }}>
              <span style={{ fontWeight: 700, fontSize: 18, color: '#065f46' }}>Net Salary</span>
              <span style={{ fontWeight: 800, fontSize: 22, color: '#059669' }}>{formatCurrency(payslip.net_salary)}</span>
            </div>

            <div style={{ marginTop: 12, padding: 14, background: '#f8fafc', borderRadius: 10, border: '1.5px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employer Contributions (Company Cost)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>EPF Employer (12%)</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{formatCurrency(payslip.epf_employer_contribution)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>ETF Employer (3%)</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{formatCurrency(payslip.etf_employer_contribution)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 13.5, color: '#1e293b' }}>Total Payroll Cost</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#3b82f6' }}>
                  {formatCurrency(payslip.gross_salary + payslip.epf_employer_contribution + payslip.etf_employer_contribution)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Action Panel */}
        <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 12, padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={12} color="#b45309" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Administrator Final Approval</span>
            </div>
            <p style={{ margin: '0 0 0 31px', fontSize: 13, color: '#78350f' }}>
              By approving this payslip, the employee will be notified via email and can proceed to sign digitally.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={processing}
              style={{ padding: '11px 22px', borderRadius: 10, border: '1.5px solid #fca5a5', background: '#fff', color: '#ef4444', cursor: processing ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 7, opacity: processing ? 0.5 : 1, transition: 'all 0.2s' }}
              onMouseEnter={e => { if (!processing) e.currentTarget.style.background = '#fff1f2' }}
              onMouseLeave={e => { if (!processing) e.currentTarget.style.background = '#fff' }}
            >
              <XCircle size={16} />Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={processing}
              style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: processing ? '#e2e8f0' : 'linear-gradient(135deg, #059669, #10b981)', color: processing ? '#94a3b8' : '#fff', cursor: processing ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 7, opacity: processing ? 0.5 : 1, boxShadow: processing ? 'none' : '0 4px 14px rgba(16,185,129,0.35)', transition: 'all 0.2s' }}
            >
              <UserCheck size={16} />{processing ? 'Approving...' : 'Final Approve & Notify Employee'}
            </button>
          </div>
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,15,37,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 500, width: '90%', boxShadow: '0 20px 60px rgba(4,15,37,0.25)', border: '1.5px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={20} color="#ef4444" />Reject Payslip
              </h3>
              <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: 13.5 }}>
                Please provide a detailed reason for rejecting this payslip. This will help the accountant make necessary corrections.
              </p>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason (e.g., incorrect allowances, calculation errors, missing deductions)..."
                rows={4}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' as const }}
                onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)' }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowRejectModal(false); setRejectionReason(''); setError(null) }}
                  disabled={processing}
                  style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', cursor: processing ? 'not-allowed' : 'pointer', fontSize: 13.5, fontWeight: 600, color: '#64748b' }}
                >Cancel</button>
                <button
                  onClick={handleReject}
                  disabled={processing || !rejectionReason.trim()}
                  style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: processing || !rejectionReason.trim() ? '#e2e8f0' : '#ef4444', color: processing || !rejectionReason.trim() ? '#94a3b8' : '#fff', cursor: processing || !rejectionReason.trim() ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13.5 }}
                >{processing ? 'Rejecting...' : 'Confirm Rejection'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={17} color="#3b82f6" />
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Payslips Pending Administrator Approval</h2>
          <span style={{ padding: '3px 10px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', borderRadius: 6, fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Shield size={11} />ADMIN LEVEL
          </span>
        </div>
        <p style={{ margin: '0 0 0 42px', color: '#64748b', fontSize: 13.5 }}>Final approval stage — payslips reviewed by staff accountants</p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: 10, color: '#991b1b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
          <AlertCircle size={15} /><span>{error}</span>
        </div>
      )}

      {payslips.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #e2e8f0' }}>
          <UserCheck size={48} style={{ color: '#cbd5e1', marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 6px', color: '#475569' }}>No Payslips Awaiting Approval</h3>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 13.5 }}>There are no payslips pending administrator approval at this time.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {payslips.map(payslip => (
            <div
              key={payslip.payslip_id}
              style={{ padding: '16px 20px', background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', transition: 'all 0.2s', cursor: 'pointer' }}
              onClick={() => handleViewPayslip(payslip.payslip_id)}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(59,130,246,0.1)'; e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{payslip.first_name} {payslip.last_name}</span>
                  <span style={{ padding: '3px 8px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', borderRadius: 5, fontSize: 11.5, fontWeight: 700 }}>
                    AWAITING ADMIN
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 13, color: '#64748b', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} />{MONTHS[payslip.payslip_month - 1]} {payslip.payslip_year}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={12} />{payslip.employee_department || 'N/A'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={12} />Net: {formatCurrency(payslip.net_salary)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} />{new Date(payslip.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(59,130,246,0.25)' }}
              >
                <Eye size={14} />Review & Approve
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
