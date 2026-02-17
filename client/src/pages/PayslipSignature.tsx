import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import SignatureCanvas from 'react-signature-canvas'
import { Download, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import {
  verifyPayslipToken,
  getEmployeePayslipDetails,
  signEmployeePayslip,
  downloadEmployeePayslip,
  type PayslipWithSignatures
} from '../services/employeePortalService'

/**
 * Payslip Signature Landing Page
 * Phase 12 Implementation
 * 
 * This page allows employees to sign their payslips via email link
 * - Validates signature token from URL
 * - Requires authentication
 * - Captures digital signature
 * - Submits signature and updates payslip status
 */

export default function PayslipSignature() {
  const { payslipId } = useParams<{ payslipId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const sigCanvas = useRef<SignatureCanvas>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [payslipData, setPayslipData] = useState<PayslipWithSignatures | null>(null)
  const [signing, setSigning] = useState(false)
  const [success, setSuccess] = useState(false)
  const [signedAt, setSignedAt] = useState<string | null>(null)

  // Get access token from localStorage
  const accessToken = localStorage.getItem('token')
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null

  useEffect(() => {
    const signatureToken = searchParams.get('token')

    if (!signatureToken) {
      setTokenError('No signature token provided')
      setLoading(false)
      return
    }

    setToken(signatureToken)
    validateTokenAndLoadPayslip(signatureToken)
  }, [searchParams])

  const validateTokenAndLoadPayslip = async (signatureToken: string) => {
    try {
      // Validate token
      const validation = await verifyPayslipToken(signatureToken)

      if (!validation.valid) {
        if (validation.errorCode === 'EXPIRED') {
          setTokenError('This link has expired. Please contact HR for a new link.')
        } else if (validation.errorCode === 'ALREADY_USED') {
          setTokenError('This payslip has already been signed.')
        } else {
          setTokenError(validation.error || 'Invalid signature link')
        }
        setLoading(false)
        return
      }

      // Check if user is logged in
      if (!accessToken || !user) {
        // Redirect to login with return URL
        const returnUrl = `/payslip-signature/${payslipId}?token=${signatureToken}`
        navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
        return
      }

      // Set employee ID from validation
      setEmployeeId(validation.employeeId!)

      // Fetch payslip details
      const details = await getEmployeePayslipDetails(
        validation.employeeId!,
        validation.payslipId!,
        accessToken
      )

      setPayslipData(details)
      setLoading(false)

      // Check if already signed by employee
      const employeeSigned = details.signatures.some(
        sig => sig.signer_role === 'EMPLOYEE'
      )

      if (employeeSigned) {
        setTokenError('This payslip has already been signed.')
        setSuccess(true)
      }

    } catch (err) {
      console.error('Error validating token:', err)
      setError(err instanceof Error ? err.message : 'Failed to load payslip')
      setLoading(false)
    }
  }

  const handleClearSignature = () => {
    sigCanvas.current?.clear()
  }

  const handleSubmitSignature = async () => {
    if (!sigCanvas.current || !token || !employeeId || !payslipData) {
      return
    }

    // Check if signature is empty
    if (sigCanvas.current.isEmpty()) {
      alert('Please provide your signature before submitting')
      return
    }

    setSigning(true)
    setError(null)

    try {
      // Get signature as base64 data URL
      const signatureData = sigCanvas.current.toDataURL()

      // Submit signature
      const result = await signEmployeePayslip(
        employeeId,
        payslipData.payslip.payslip_id,
        signatureData,
        token,
        accessToken!
      )

      if (result.success) {
        setSuccess(true)
        setSignedAt(result.signedAt || null)
      } else {
        setError(result.message || 'Failed to sign payslip')
      }
    } catch (err) {
      console.error('Error signing payslip:', err)
      setError(err instanceof Error ? err.message : 'Failed to sign payslip')
    } finally {
      setSigning(false)
    }
  }

  const handleDownloadPayslip = async () => {
    if (!employeeId || !payslipData || !accessToken) return

    try {
      const blob = await downloadEmployeePayslip(
        employeeId,
        payslipData.payslip.payslip_id,
        accessToken
      )
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Payslip_${payslipData.payslip.payslip_year}_${payslipData.payslip.payslip_month.toString().padStart(2, '0')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error downloading payslip:', err)
      alert('Failed to download payslip')
    }
  }

  const getMonthName = (month: number) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    return monthNames[month - 1]
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <div>Verifying signature link...</div>
        </div>
      </div>
    )
  }

  // Token error state
  if (tokenError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 20 }}>
        <div className="glass-panel" style={{ maxWidth: 600, width: '100%', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>
            {tokenError.includes('expired') ? <Clock size={64} color="#f59e0b" /> : <XCircle size={64} color="#ef4444" />}
          </div>
          <h2 style={{ margin: '0 0 16px', fontSize: 24 }}>Unable to Sign Payslip</h2>
          <p style={{ color: '#cbd5e1', marginBottom: 32 }}>{tokenError}</p>
          {success && payslipData && (
            <button onClick={handleDownloadPayslip} className="btn-primary" style={{ marginBottom: 16 }}>
              <Download size={16} style={{ marginRight: 8 }} />
              Download Signed Payslip
            </button>
          )}
          <button onClick={() => navigate('/employee-portal')} className="btn-primary" style={{ background: '#6b7280' }}>
            Go to Employee Portal
          </button>
        </div>
      </div>
    )
  }

  // Success state
  if (success && payslipData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 20 }}>
        <div className="glass-panel" style={{ maxWidth: 700, width: '100%', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 24, color: '#10b981' }}>
            <CheckCircle size={64} />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 28 }}>✅ Payslip Signed Successfully!</h2>
          <p style={{ color: '#cbd5e1', marginBottom: 32 }}>
            Thank you for signing your payslip for {getMonthName(payslipData.payslip.payslip_month)} {payslipData.payslip.payslip_year}
          </p>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, padding: 24, marginBottom: 32, textAlign: 'left' }}>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>Net Salary</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#10b981', marginBottom: 16 }}>
              {formatCurrency(payslipData.payslip.net_salary)}
            </div>
            <div style={{ fontSize: 14, color: '#cbd5e1' }}>
              {signedAt && `Signed at: ${new Date(signedAt).toLocaleString()}`}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleDownloadPayslip} className="btn-primary">
              <Download size={16} style={{ marginRight: 8 }} />
              Download Signed Payslip PDF
            </button>
            <button onClick={() => navigate('/employee-portal')} className="btn-primary" style={{ background: '#6b7280' }}>
              Go to Employee Portal
            </button>
          </div>

          <div style={{ marginTop: 32, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, fontSize: 14, color: '#cbd5e1' }}>
            <strong>📄 What's Next?</strong>
            <p style={{ margin: '8px 0 0' }}>Your signed payslip is now available in your employee portal under the Payroll section. You can download it at any time.</p>
          </div>
        </div>
      </div>
    )
  }

  // Main signature interface
  if (!payslipData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div className="glass-panel" style={{ maxWidth: 600, width: '100%', padding: 40, textAlign: 'center' }}>
          <AlertCircle size={64} color="#f59e0b" style={{ marginBottom: 24 }} />
          <h2 style={{ margin: '0 0 16px', fontSize: 24 }}>Error Loading Payslip</h2>
          <p style={{ color: '#cbd5e1', marginBottom: 32 }}>{error || 'Unable to load payslip data'}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: '40px 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div className="glass-panel" style={{ padding: 32, marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 32 }}>💰 Sign Your Payslip</h1>
          <p style={{ color: '#cbd5e1', margin: 0 }}>
            {getMonthName(payslipData.payslip.payslip_month)} {payslipData.payslip.payslip_year}
          </p>
        </div>

        {/* Payslip Details */}
        <div className="glass-panel" style={{ padding: 32, marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 20 }}>📄 Payslip Summary</h2>

          {/* Employee Info */}
          <div style={{ marginBottom: 24, padding: 16, background: 'rgba(0, 0, 0, 0.2)', borderRadius: 8 }}>
            <div style={{ marginBottom: 8 }}><strong>Employee:</strong> {payslipData.payslip.employee_name}</div>
            <div style={{ marginBottom: 8 }}><strong>Employee #:</strong> {payslipData.payslip.employee_number}</div>
            <div style={{ marginBottom: 8 }}><strong>Position:</strong> {payslipData.payslip.designation}</div>
            <div><strong>Department:</strong> {payslipData.payslip.employee_department}</div>
          </div>

          {/* Financial Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Gross Salary</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#3b82f6' }}>{formatCurrency(payslipData.payslip.gross_salary)}</div>
            </div>
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Deductions</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#ef4444' }}>{formatCurrency(payslipData.payslip.total_deductions)}</div>
            </div>
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Net Salary</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#10b981' }}>{formatCurrency(payslipData.payslip.net_salary)}</div>
            </div>
          </div>

          {/* Signatures */}
          {payslipData.signatures.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>✍️ Approval Signatures</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {payslipData.signatures.filter(sig => sig.signer_role !== 'EMPLOYEE').map((sig) => (
                  <div key={sig.signature_id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, background: 'rgba(0, 0, 0, 0.1)', borderRadius: 4, fontSize: 14 }}>
                    <span>
                      <strong>{sig.signer_role.replace(/_/g, ' ')}</strong>: {sig.signer_name}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>
                      {new Date(sig.signed_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Signature Pad */}
        <div className="glass-panel" style={{ padding: 32 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>✍️ Your Signature</h2>
          <p style={{ color: '#cbd5e1', marginBottom: 24, fontSize: 14 }}>
            Please sign in the box below to acknowledge receipt of your payslip. By signing, you confirm that you have reviewed the details and agree with the amounts shown.
          </p>

          {/* Signature Canvas */}
          <div style={{ border: '2px solid rgba(255, 255, 255, 0.1)', borderRadius: 8, background: '#fff', marginBottom: 16, overflow: 'hidden' }}>
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                width: 800,
                height: 200,
                className: 'signature-canvas',
                style: { width: '100%', height: '200px', touchAction: 'none' }
              }}
              backgroundColor="#ffffff"
              penColor="#000000"
            />
          </div>

          {/* Signature Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <button
              onClick={handleClearSignature}
              className="btn-primary"
              style={{ background: '#6b7280' }}
              disabled={signing}
            >
              Clear Signature
            </button>
            <button
              onClick={handleSubmitSignature}
              className="btn-primary"
              style={{ background: '#10b981', minWidth: 200 }}
              disabled={signing}
            >
              {signing ? 'Submitting...' : '✓ Submit Signature'}
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, color: '#ef4444', fontSize: 14 }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 24, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, fontSize: 13, color: '#cbd5e1' }}>
            <strong>📝 Note:</strong> Your signature will be digitally recorded and attached to your payslip. Once signed, the payslip status will be updated to "Completed" and you'll receive a confirmation email.
          </div>
        </div>
      </div>
    </div>
  )
}
