import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle, Download, FileText, AlertCircle, Shield } from 'lucide-react'

interface Payslip {
  payslip_id: number
  employee_id: number
  payslip_month: number
  payslip_year: number
  basic_salary: string
  allowances: Record<string, number>
  gross_salary: string
  epf_employee_deduction: string
  epf_employee_rate: string
  other_deductions: Record<string, number>
  total_deductions: string
  epf_employer_contribution: string
  etf_employer_contribution: string
  net_salary: string
  status: string
  first_name: string
  last_name: string
  employee_number: string
  employee_department: string
  designation: string
}

interface Signature {
  signature_id: number
  signer_role: string
  signer_name: string
  signed_at: string
  signature_hash: string
}

const EmployeePayslipSignature: React.FC = () => {
  const { payslipId } = useParams<{ payslipId: string }>()
  useSearchParams()
  // Token is available in URL params but handled by backend authentication
  // const token = searchParams.get('token')

  const [payslip, setPayslip] = useState<Payslip | null>(null)
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)

  useEffect(() => {
    fetchPayslipData()
  }, [payslipId])

  const fetchPayslipData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payroll/payslips/${payslipId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch payslip')
      }

      const data = await response.json()
      setPayslip(data.payslip)
      setSignatures(data.signatures)
      
      // Check if already signed by employee
      const employeeSig = data.signatures.find((sig: Signature) => sig.signer_role === 'EMPLOYEE')
      if (employeeSig) {
        setSigned(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payslip')
    } finally {
      setLoading(false)
    }
  }

  const handleSign = async () => {
    if (!payslipId) return

    try {
      setSigning(true)
      setError('')
      
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payroll/payslips/${payslipId}/employee-sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to sign payslip')
      }

      setSigned(true)
      fetchPayslipData() // Refresh to show new signature
      
      // Show success message
      alert('✅ Payslip signed successfully! You can now download your signed payslip.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign payslip')
    } finally {
      setSigning(false)
    }
  }

  const handleDownload = () => {
    // TODO: Implement PDF download
    alert('PDF download feature will be implemented in Phase 7')
  }

  const getMonthName = (month: number) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December']
    return monthNames[month - 1]
  }

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(value.toString()))
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateHash = (hash: string) => {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your payslip...</p>
        </div>
      </div>
    )
  }

  if (error || !payslip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Access Error</h2>
          <p className="text-center text-gray-600 mb-6">
            {error || 'Unable to load payslip. Please check your link or contact HR.'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-xl shadow-lg p-6 border-b-4 border-blue-600">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Your Payslip</h1>
              <p className="text-gray-600 mt-1">
                {getMonthName(payslip.payslip_month)} {payslip.payslip_year}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <FileText size={24} />
                <span className="font-semibold">#{payslip.payslip_id}</span>
              </div>
              {signed && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle size={16} />
                  <span>Signed</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-gray-500">Employee Name</p>
              <p className="font-semibold text-gray-800">{payslip.first_name} {payslip.last_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Employee Number</p>
              <p className="font-semibold text-gray-800">{payslip.employee_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Department</p>
              <p className="font-semibold text-gray-800">{payslip.employee_department || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Designation</p>
              <p className="font-semibold text-gray-800">{payslip.designation || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Salary Details */}
        <div className="bg-white shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Salary Breakdown</h2>
          
          {/* Earnings */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <div className="w-1 h-6 bg-green-500 rounded"></div>
              Earnings
            </h3>
            <div className="space-y-2 pl-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Basic Salary</span>
                <span className="font-medium">{formatCurrency(payslip.basic_salary)}</span>
              </div>
              {Object.entries(payslip.allowances || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600 capitalize">{key.replace('_', ' ')}</span>
                  <span className="font-medium">{formatCurrency(value)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t font-semibold">
                <span className="text-gray-700">Gross Salary</span>
                <span className="text-green-600">{formatCurrency(payslip.gross_salary)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <div className="w-1 h-6 bg-red-500 rounded"></div>
              Deductions
            </h3>
            <div className="space-y-2 pl-4">
              {parseFloat(payslip.epf_employee_deduction) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">EPF ({payslip.epf_employee_rate}%)</span>
                  <span className="font-medium">-{formatCurrency(payslip.epf_employee_deduction)}</span>
                </div>
              )}
              {Object.entries(payslip.other_deductions || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600 capitalize">{key.replace('_', ' ')}</span>
                  <span className="font-medium">-{formatCurrency(value)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t font-semibold">
                <span className="text-gray-700">Total Deductions</span>
                <span className="text-red-600">-{formatCurrency(payslip.total_deductions)}</span>
              </div>
            </div>
          </div>

          {/* Net Salary */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-blue-100 text-sm mb-1">Net Salary</p>
                <p className="text-4xl font-bold">{formatCurrency(payslip.net_salary)}</p>
              </div>
              <CheckCircle size={48} className="text-blue-200" />
            </div>
          </div>

          {/* Employer Contributions */}
          {(parseFloat(payslip.epf_employer_contribution) > 0 || parseFloat(payslip.etf_employer_contribution) > 0) && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-gray-700 mb-2">Employer Contributions</h3>
              <div className="space-y-1 text-sm">
                {parseFloat(payslip.epf_employer_contribution) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">EPF (12%)</span>
                    <span className="font-medium">{formatCurrency(payslip.epf_employer_contribution)}</span>
                  </div>
                )}
                {parseFloat(payslip.etf_employer_contribution) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">ETF (3%)</span>
                    <span className="font-medium">{formatCurrency(payslip.etf_employer_contribution)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Approval Trail */}
        {signatures.length > 0 && (
          <div className="bg-white shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Shield size={20} className="text-blue-600" />
              Digital Signatures
            </h2>
            <div className="space-y-3">
              {signatures.map((sig) => (
                <div key={sig.signature_id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle size={20} className="text-green-600 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">{sig.signer_name}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {sig.signer_role.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{formatDate(sig.signed_at)}</p>
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {truncateHash(sig.signature_hash)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-b-xl shadow-lg p-6">
          {!signed ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Action Required:</strong> Please review your payslip carefully and sign to acknowledge receipt.
                </p>
              </div>
              <button
                onClick={handleSign}
                disabled={signing}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {signing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Signing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Accept & Sign Payslip
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle size={20} />
                  <p className="font-semibold">Thank you! Your payslip has been signed.</p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Download Signed Payslip (PDF)
              </button>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>This is an official payslip document from Bloomtech ERP.</p>
          <p className="mt-1">For any queries, please contact HR or Finance department.</p>
        </div>
      </div>
    </div>
  )
}

export default EmployeePayslipSignature
