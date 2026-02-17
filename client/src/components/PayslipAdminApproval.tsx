import { useState, useEffect } from 'react'
import { UserCheck, XCircle, Eye, Calendar, DollarSign, User, Building2, FileText, Clock, AlertCircle, CheckCircle, Shield } from 'lucide-react'
import { getAllPayslips, getPayslipById, adminApprove, rejectPayslip } from '../services/payrollService'
import type { Payslip, PayslipWithSignatures } from '../types/payroll'
import { truncateSignatureHash } from '../utils/signatureHashGenerator'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function PayslipAdminApproval() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipWithSignatures | null>(null)
  const [viewingPayslip, setViewingPayslip] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    loadPayslips()
  }, [])

  const loadPayslips = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getAllPayslips({ status: 'PENDING_ADMIN_APPROVAL' })
      setPayslips(response.payslips)
    } catch (err) {
      setError('Failed to load payslips for approval')
      console.error('Error loading payslips:', err)
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
    } catch (err) {
      setError('Failed to load payslip details')
      console.error('Error loading payslip:', err)
    }
  }

  const handleApprove = async () => {
    if (!selectedPayslip) return

    try {
      setProcessing(true)
      setError(null)
      await adminApprove(selectedPayslip.payslip.payslip_id)
      setSuccessMessage('Payslip approved! Employee will be notified via email.')
      setViewingPayslip(false)
      setSelectedPayslip(null)
      await loadPayslips()
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      setError('Failed to approve payslip')
      console.error('Error approving payslip:', err)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedPayslip || !rejectionReason.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

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
    } catch (err) {
      setError('Failed to reject payslip')
      console.error('Error rejecting payslip:', err)
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
        <p style={{ margin: 0, color: '#666' }}>Loading payslips for approval...</p>
      </div>
    )
  }

  if (viewingPayslip && selectedPayslip) {
    const payslip = selectedPayslip.payslip
    const signatures = selectedPayslip.signatures

    return (
      <div style={{ display: 'grid', gap: 24 }}>
        {/* Success/Error Messages */}
        {successMessage && (
          <div style={{ 
            padding: 16, 
            background: '#d4edda', 
            border: '1px solid #c3e6cb', 
            borderRadius: 8,
            color: '#155724',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <CheckCircle size={20} />
            <span>{successMessage}</span>
          </div>
        )}
        {error && (
          <div style={{ 
            padding: 16, 
            background: '#f8d7da', 
            border: '1px solid #f5c6cb', 
            borderRadius: 8,
            color: '#721c24',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Header with Admin Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ margin: 0 }}>Final Approval</h2>
              <span style={{ 
                padding: '4px 12px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: '#fff', 
                borderRadius: 4, 
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <Shield size={14} />
                ADMIN
              </span>
            </div>
            <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
              Payslip #{payslip.payslip_id} - {MONTHS[payslip.payslip_month - 1]} {payslip.payslip_year}
            </p>
          </div>
          <button
            onClick={() => {
              setViewingPayslip(false)
              setSelectedPayslip(null)
              setError(null)
            }}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            ← Back to List
          </button>
        </div>

        {/* Employee Information */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={20} />
            Employee Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>
                Employee Name
              </label>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {payslip.first_name} {payslip.last_name}
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>
                Employee Number
              </label>
              <p style={{ margin: 0, fontWeight: 600 }}>{payslip.employee_number}</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>
                Department
              </label>
              <p style={{ margin: 0, fontWeight: 600 }}>{payslip.employee_department || 'N/A'}</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>
                Designation
              </label>
              <p style={{ margin: 0, fontWeight: 600 }}>{payslip.designation || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Previous Approvals - Prominently displayed */}
        <div className="glass-panel" style={{ 
          padding: 24, 
          background: 'linear-gradient(to right, #f8f9fa, #e9ecef)',
          border: '2px solid #667eea'
        }}>
          <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} />
            Previous Approvals
          </h3>
          {signatures.length > 0 ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {signatures.map((sig) => (
                <div key={sig.signature_id} style={{ 
                  padding: 16, 
                  background: '#fff', 
                  borderRadius: 8,
                  borderLeft: '4px solid #28a745',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <strong style={{ fontSize: 16 }}>{sig.signer_name}</strong>
                      <span style={{ 
                        marginLeft: 8, 
                        padding: '4px 8px', 
                        background: '#28a745', 
                        color: '#fff',
                        borderRadius: 4, 
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        ✓ {sig.signer_role.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={14} />
                      {new Date(sig.signed_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', fontFamily: 'monospace', background: '#f8f9fa', padding: 8, borderRadius: 4 }}>
                    Signature Hash: {truncateSignatureHash(sig.signature_hash, 10)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: '#666', fontStyle: 'italic' }}>No previous signatures found</p>
          )}
        </div>

        {/* Salary Details */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={20} />
            Salary Breakdown
          </h3>
          
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Basic Salary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
              <span style={{ color: '#666' }}>Basic Salary</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(payslip.basic_salary)}</span>
            </div>

            {/* Allowances */}
            {Object.keys(payslip.allowances || {}).length > 0 && (
              <div>
                <strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Allowances</strong>
                {Object.entries(payslip.allowances).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 8px 16px' }}>
                    <span style={{ color: '#666', textTransform: 'capitalize' }}>{key}</span>
                    <span style={{ fontWeight: 500 }}>{formatCurrency(Number(value))}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Gross Salary */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '12px 0', 
              borderTop: '2px solid #ddd',
              borderBottom: '2px solid #ddd'
            }}>
              <span style={{ fontWeight: 600, fontSize: 16 }}>Gross Salary</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--primary)' }}>
                {formatCurrency(payslip.gross_salary)}
              </span>
            </div>

            {/* Deductions */}
            <div>
              <strong style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#d9534f' }}>
                Deductions
              </strong>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 8px 16px' }}>
                <span style={{ color: '#666' }}>EPF Employee Contribution ({payslip.epf_employee_rate}%)</span>
                <span style={{ fontWeight: 500, color: '#d9534f' }}>
                  {formatCurrency(payslip.epf_employee_deduction)}
                </span>
              </div>
              {Object.entries(payslip.other_deductions || {}).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 8px 16px' }}>
                  <span style={{ color: '#666', textTransform: 'capitalize' }}>{key}</span>
                  <span style={{ fontWeight: 500, color: '#d9534f' }}>{formatCurrency(Number(value))}</span>
                </div>
              ))}
            </div>

            {/* Total Deductions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #eee' }}>
              <span style={{ fontWeight: 600 }}>Total Deductions</span>
              <span style={{ fontWeight: 700, color: '#d9534f' }}>
                {formatCurrency(payslip.total_deductions)}
              </span>
            </div>

            {/* Net Salary - Highlighted */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: 20,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 8,
              color: '#fff',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
            }}>
              <span style={{ fontWeight: 700, fontSize: 20 }}>Net Salary</span>
              <span style={{ fontWeight: 700, fontSize: 24 }}>
                {formatCurrency(payslip.net_salary)}
              </span>
            </div>

            {/* Employer Contributions */}
            <div style={{ marginTop: 16, padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
              <strong style={{ display: 'block', marginBottom: 12, fontSize: 14 }}>
                Employer Contributions (Company Cost)
              </strong>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#666' }}>EPF Employer (12%)</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(payslip.epf_employer_contribution)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #ddd' }}>
                <span style={{ color: '#666' }}>ETF Employer (3%)</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(payslip.etf_employer_contribution)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                <span style={{ fontWeight: 600 }}>Total Payroll Cost</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--primary)' }}>
                  {formatCurrency(payslip.gross_salary + payslip.epf_employer_contribution + payslip.etf_employer_contribution)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Action Buttons */}
        <div className="glass-panel" style={{ 
          padding: 24, 
          background: 'linear-gradient(to right, #fff8e1, #fff3cd)',
          border: '2px solid #ffc107'
        }}>
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={18} />
              Administrator Final Approval
            </h4>
            <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
              By approving this payslip, the employee will be notified via email and can proceed to sign digitally.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={processing}
              style={{
                padding: '14px 28px',
                borderRadius: 8,
                border: '2px solid #d9534f',
                background: '#fff',
                color: '#d9534f',
                cursor: processing ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: processing ? 0.5 : 1
              }}
            >
              <XCircle size={20} />
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={processing}
              style={{
                padding: '14px 28px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                color: '#fff',
                cursor: processing ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: processing ? 0.5 : 1,
                boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)'
              }}
            >
              <UserCheck size={20} />
              {processing ? 'Approving...' : 'Final Approve & Notify Employee'}
            </button>
          </div>
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="glass-panel" style={{ 
              padding: 32, 
              maxWidth: 500, 
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={24} color="#d9534f" />
                Reject Payslip
              </h3>
              <p style={{ margin: '0 0 16px', color: '#666' }}>
                Please provide a detailed reason for rejecting this payslip. This will help the accountant make necessary corrections.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason (e.g., incorrect allowances, calculation errors, missing deductions)..."
                style={{
                  width: '100%',
                  minHeight: 140,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectionReason('')
                    setError(null)
                  }}
                  disabled={processing}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    background: '#fff',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    fontSize: 14
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing || !rejectionReason.trim()}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#d9534f',
                    color: '#fff',
                    cursor: (processing || !rejectionReason.trim()) ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    opacity: (processing || !rejectionReason.trim()) ? 0.5 : 1
                  }}
                >
                  {processing ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="glass-panel" style={{ padding: 24 }}>
      {/* Success Message */}
      {successMessage && (
        <div style={{ 
          padding: 16, 
          background: '#d4edda', 
          border: '1px solid #c3e6cb', 
          borderRadius: 8,
          color: '#155724',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <CheckCircle size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserCheck size={24} />
          Payslips Pending Administrator Approval
          <span style={{ 
            padding: '4px 12px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: '#fff', 
            borderRadius: 4, 
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <Shield size={14} />
            ADMIN LEVEL
          </span>
        </h2>
        <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
          Final approval stage - payslips that have been reviewed by staff accountants
        </p>
      </div>

      {/* Payslips List */}
      {error && (
        <div style={{ 
          padding: 16, 
          background: '#f8d7da', 
          border: '1px solid #f5c6cb', 
          borderRadius: 8,
          color: '#721c24',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {payslips.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
          <UserCheck size={64} style={{ color: '#ccc', marginBottom: 16 }} />
          <h3 style={{ margin: '0 0 8px' }}>No Payslips Awaiting Approval</h3>
          <p style={{ margin: 0 }}>
            There are no payslips pending administrator approval at this time.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {payslips.map((payslip) => (
            <div
              key={payslip.payslip_id}
              style={{
                padding: 20,
                background: '#fff',
                borderRadius: 8,
                border: '2px solid #667eea',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 16,
                alignItems: 'center',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onClick={() => handleViewPayslip(payslip.payslip_id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.3)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: 16 }}>
                    {payslip.first_name} {payslip.last_name}
                  </h4>
                  <span style={{ 
                    padding: '4px 8px', 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                    color: '#fff', 
                    borderRadius: 4, 
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    AWAITING ADMIN
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 14, color: '#666', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={14} />
                    {MONTHS[payslip.payslip_month - 1]} {payslip.payslip_year}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Building2 size={14} />
                    {payslip.employee_department || 'N/A'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <DollarSign size={14} />
                    Net: {formatCurrency(payslip.net_salary)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={14} />
                    {new Date(payslip.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                }}
              >
                <Eye size={16} />
                Review & Approve
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
