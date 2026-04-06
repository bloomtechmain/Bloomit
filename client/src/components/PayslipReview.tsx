import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Eye, Calendar, DollarSign, User, Building2, FileText, Clock, AlertCircle } from 'lucide-react'
import { getAllPayslips, getPayslipById, staffApprove, rejectPayslip } from '../services/payrollService'
import type { Payslip, PayslipWithSignatures } from '../types/payroll'
import { truncateSignatureHash } from '../utils/signatureHashGenerator'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const card: React.CSSProperties = {
  background: '#fff',
  border: '1.5px solid #e2e8f0',
  borderRadius: 12,
  padding: 24,
  boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
}

const sectionHeader = (icon: React.ReactNode, label: string, iconBg: string, iconColor: string) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
    <div style={{ width: 26, height: 26, borderRadius: 7, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icon}
    </div>
    <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: '#475569' }}>{label}</span>
  </div>
)

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount)

export default function PayslipReview() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipWithSignatures | null>(null)
  const [viewingPayslip, setViewingPayslip] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => { loadPayslips() }, [])

  const loadPayslips = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getAllPayslips({ status: 'PENDING_STAFF_REVIEW' })
      setPayslips(response.payslips)
    } catch {
      setError('Failed to load payslips for review')
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
      await staffApprove(selectedPayslip.payslip.payslip_id)
      setSuccessMessage('Payslip approved successfully!')
      setViewingPayslip(false)
      setSelectedPayslip(null)
      await loadPayslips()
      setTimeout(() => setSuccessMessage(null), 3000)
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
      setSuccessMessage('Payslip rejected and sent back for revision')
      setShowRejectModal(false)
      setRejectionReason('')
      setViewingPayslip(false)
      setSelectedPayslip(null)
      await loadPayslips()
      setTimeout(() => setSuccessMessage(null), 3000)
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
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Loading payslips for review...</p>
      </div>
    )
  }

  if (viewingPayslip && selectedPayslip) {
    const payslip = selectedPayslip.payslip
    const signatures = selectedPayslip.signatures

    return (
      <div style={{ display: 'grid', gap: 20 }}>
        {successMessage && (
          <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, color: '#166534', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
            <CheckCircle size={16} /><span>{successMessage}</span>
          </div>
        )}
        {error && (
          <div style={{ padding: '12px 16px', background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: 10, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
            <AlertCircle size={16} /><span>{error}</span>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Review Payslip</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
              Payslip #{payslip.payslip_id} — {MONTHS[payslip.payslip_month - 1]} {payslip.payslip_year}
            </p>
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
          {sectionHeader(<User size={13} color="#3b82f6" />, 'Employee Information', 'rgba(59,130,246,0.1)', '#3b82f6')}
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

        {/* Salary Details */}
        <div style={card}>
          {sectionHeader(<DollarSign size={13} color="#f59e0b" />, 'Salary Breakdown', 'rgba(245,158,11,0.1)', '#f59e0b')}
          <div style={{ display: 'grid', gap: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b', fontSize: 13.5 }}>Basic Salary</span>
              <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 13.5 }}>{formatCurrency(payslip.basic_salary)}</span>
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
                <span style={{ color: '#64748b', fontSize: 13 }}>EPF Employee Contribution ({payslip.epf_employee_rate}%)</span>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16, background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', borderRadius: 10, marginTop: 8, border: '1px solid #bbf7d0' }}>
              <span style={{ fontWeight: 700, fontSize: 17, color: '#065f46' }}>Net Salary</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: '#059669' }}>{formatCurrency(payslip.net_salary)}</span>
            </div>

            <div style={{ marginTop: 12, padding: 14, background: '#f8fafc', borderRadius: 10, border: '1.5px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employer Contributions</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>EPF Employer (12%)</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{formatCurrency(payslip.epf_employer_contribution)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>ETF Employer (3%)</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{formatCurrency(payslip.etf_employer_contribution)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Approval Trail */}
        {signatures.length > 0 && (
          <div style={card}>
            {sectionHeader(<FileText size={13} color="#6366f1" />, 'Approval Trail', 'rgba(99,102,241,0.1)', '#6366f1')}
            <div style={{ display: 'grid', gap: 10 }}>
              {signatures.map(sig => (
                <div key={sig.signature_id} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 9, borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: '#1e293b' }}>{sig.signer_name}</span>
                      <span style={{ padding: '2px 8px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, fontSize: 11.5, fontWeight: 600, color: '#1e40af' }}>
                        {sig.signer_role.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />{new Date(sig.signed_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', fontFamily: 'monospace' }}>
                    {truncateSignatureHash(sig.signature_hash)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
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
            style={{ padding: '11px 22px', borderRadius: 10, border: 'none', background: processing ? '#e2e8f0' : 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: processing ? '#94a3b8' : '#fff', cursor: processing ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 7, boxShadow: processing ? 'none' : '0 4px 14px rgba(59,130,246,0.35)', transition: 'all 0.2s' }}
          >
            <CheckCircle size={16} />{processing ? 'Approving...' : 'Approve & Sign'}
          </button>
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,15,37,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 480, width: '90%', boxShadow: '0 20px 60px rgba(4,15,37,0.25)', border: '1.5px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={20} color="#ef4444" />Reject Payslip
              </h3>
              <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: 13.5 }}>Please provide a reason for rejecting this payslip:</p>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' as const, transition: 'all 0.2s' }}
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
    <div style={{ display: 'grid', gap: 20 }}>
      {successMessage && (
        <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, color: '#166534', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
          <CheckCircle size={16} /><span>{successMessage}</span>
        </div>
      )}

      <div style={card}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={17} color="#3b82f6" />
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Payslips Pending Staff Review</h2>
          </div>
          <p style={{ margin: '0 0 0 42px', color: '#64748b', fontSize: 13.5 }}>Review and approve payslips submitted by junior accountants</p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: 10, color: '#991b1b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
            <AlertCircle size={15} /><span>{error}</span>
          </div>
        )}

        {payslips.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #e2e8f0' }}>
            <CheckCircle size={48} style={{ color: '#cbd5e1', marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 6px', color: '#475569' }}>No Payslips to Review</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 13.5 }}>There are no payslips pending staff review at this time.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {payslips.map(payslip => (
              <div
                key={payslip.payslip_id}
                style={{ padding: '16px 20px', background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', transition: 'all 0.2s', cursor: 'pointer' }}
                onClick={() => handleViewPayslip(payslip.payslip_id)}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(59,130,246,0.1)'; e.currentTarget.style.borderColor = '#93c5fd' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0' }}
              >
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{payslip.first_name} {payslip.last_name}</span>
                    <span style={{ padding: '3px 8px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 5, fontSize: 11.5, fontWeight: 700, color: '#92400e' }}>
                      PENDING REVIEW
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
                  <Eye size={14} />Review
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
