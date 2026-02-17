import { useState, useEffect } from 'react'
import { Download, Eye, Calendar, TrendingUp, FileText, CheckCircle, Clock } from 'lucide-react'
import { 
  getEmployeePayslips, 
  getEmployeePayslipDetails,
  downloadEmployeePayslip,
  getEmployeeYTDEarnings,
  type PayslipSummary,
  type PayslipWithSignatures,
  type YTDEarnings
} from '../services/employeePortalService'

interface EmployeePayrollProps {
  employeeId: number
  accessToken: string
}

export default function EmployeePayroll({ employeeId, accessToken }: EmployeePayrollProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payslips, setPayslips] = useState<PayslipSummary[]>([])
  const [ytdEarnings, setYtdEarnings] = useState<YTDEarnings | null>(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipWithSignatures | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // Generate year options (current year and 5 years back)
  const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

  // Fetch payslips and YTD earnings
  useEffect(() => {
    fetchData()
  }, [employeeId, selectedYear])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [payslipsData, ytdData] = await Promise.all([
        getEmployeePayslips(employeeId, accessToken, selectedYear),
        getEmployeeYTDEarnings(employeeId, accessToken, selectedYear)
      ])
      setPayslips(payslipsData.payslips)
      setYtdEarnings(ytdData)
    } catch (err) {
      console.error('Error fetching payroll data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load payroll data')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = async (payslipId: number) => {
    try {
      const details = await getEmployeePayslipDetails(employeeId, payslipId, accessToken)
      setSelectedPayslip(details)
      setShowDetailsModal(true)
    } catch (err) {
      console.error('Error fetching payslip details:', err)
      alert('Failed to load payslip details')
    }
  }

  const handleDownloadPayslip = async (payslipId: number, month: number, year: number) => {
    try {
      const blob = await downloadEmployeePayslip(employeeId, payslipId, accessToken)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Payslip_${year}_${month.toString().padStart(2, '0')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error downloading payslip:', err)
      alert('Failed to download payslip')
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'COMPLETED') {
      return (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 4, 
          padding: '4px 12px', 
          borderRadius: 12, 
          background: '#10b981', 
          color: '#fff', 
          fontSize: 13, 
          fontWeight: 500 
        }}>
          <CheckCircle size={14} /> Signed
        </span>
      )
    } else if (status === 'PENDING_EMPLOYEE_SIGNATURE') {
      return (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 4, 
          padding: '4px 12px', 
          borderRadius: 12, 
          background: '#f59e0b', 
          color: '#fff', 
          fontSize: 13, 
          fontWeight: 500 
        }}>
          <Clock size={14} /> Pending Signature
        </span>
      )
    }
    return null
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

  if (loading && !ytdEarnings) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <div>Loading payroll data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h3 style={{ margin: '0 0 8px' }}>Error Loading Payroll</h3>
        <p style={{ color: '#666', marginBottom: 16 }}>{error}</p>
        <button onClick={fetchData} className="btn-primary">Retry</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>💰 Payroll & Earnings</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: '#666' }}>Year:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="glass-input"
            style={{ padding: '8px 12px', minWidth: 100 }}
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* YTD Earnings Summary - Phase 10 */}
      {ytdEarnings && ytdEarnings.summary.monthsPaid > 0 && (
        <div className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={20} /> Year-to-Date Earnings ({selectedYear})
          </h2>
          
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Gross Salary</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#3b82f6' }}>{formatCurrency(ytdEarnings.summary.totalGross)}</div>
            </div>
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Deductions</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#ef4444' }}>{formatCurrency(ytdEarnings.summary.totalDeductions)}</div>
            </div>
            <div style={{ padding: 16, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Net Salary</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#10b981' }}>{formatCurrency(ytdEarnings.summary.totalNet)}</div>
            </div>
          </div>

          {/* Tax Information */}
          <div style={{ padding: 16, borderRadius: 8, background: 'rgba(0, 0, 0, 0.05)', marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>🏦 Tax & Contributions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: '#666' }}>EPF Employee ({ytdEarnings.taxInfo.epfEmployeeRate}%)</div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{formatCurrency(ytdEarnings.taxInfo.epfEmployeeTotal)}</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#666' }}>EPF Employer (12%)</div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{formatCurrency(ytdEarnings.taxInfo.epfEmployerTotal)}</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#666' }}>ETF Employer (3%)</div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{formatCurrency(ytdEarnings.taxInfo.etfEmployerTotal)}</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#666' }}>Months Paid</div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{ytdEarnings.summary.monthsPaid} months</div>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown Chart */}
          {ytdEarnings.monthlyBreakdown.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>📊 Monthly Breakdown</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <th style={{ padding: 8, textAlign: 'left' }}>Month</th>
                      <th style={{ padding: 8, textAlign: 'right' }}>Gross</th>
                      <th style={{ padding: 8, textAlign: 'right' }}>Deductions</th>
                      <th style={{ padding: 8, textAlign: 'right' }}>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ytdEarnings.monthlyBreakdown.map((item) => (
                      <tr key={item.month} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: 8 }}>{getMonthName(item.month)}</td>
                        <td style={{ padding: 8, textAlign: 'right' }}>{formatCurrency(item.grossSalary)}</td>
                        <td style={{ padding: 8, textAlign: 'right', color: '#ef4444' }}>{formatCurrency(item.deductions)}</td>
                        <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.netSalary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payslip Archive - Phase 9 */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={20} /> Payslip Archive
        </h2>

        {payslips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
            <FileText size={48} style={{ opacity: 0.5, marginBottom: 16 }} />
            <p>No payslips found for {selectedYear}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {payslips.map((payslip) => (
              <div 
                key={payslip.payslip_id} 
                className="glass-panel"
                style={{ 
                  padding: 20, 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>
                      <Calendar size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                      {getMonthName(payslip.payslip_month)} {payslip.payslip_year}
                    </h3>
                    {getStatusBadge(payslip.status)}
                  </div>
                  <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
                    <div>
                      <span style={{ color: '#666' }}>Gross: </span>
                      <span style={{ fontWeight: 500 }}>{formatCurrency(payslip.gross_salary)}</span>
                    </div>
                    <div>
                      <span style={{ color: '#666' }}>Deductions: </span>
                      <span style={{ fontWeight: 500, color: '#ef4444' }}>{formatCurrency(payslip.total_deductions)}</span>
                    </div>
                    <div>
                      <span style={{ color: '#666' }}>Net: </span>
                      <span style={{ fontWeight: 600, fontSize: 16 }}>{formatCurrency(payslip.net_salary)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleViewDetails(payslip.payslip_id)}
                    className="btn-primary"
                    style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Eye size={16} /> View Details
                  </button>
                  <button
                    onClick={() => handleDownloadPayslip(payslip.payslip_id, payslip.payslip_month, payslip.payslip_year)}
                    className="btn-primary"
                    style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, background: '#10b981' }}
                  >
                    <Download size={16} /> Download PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payslip Details Modal */}
      {showDetailsModal && selectedPayslip && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20
          }}
          onClick={() => setShowDetailsModal(false)}
        >
          <div 
            className="glass-panel"
            style={{ 
              maxWidth: 800, 
              width: '100%', 
              maxHeight: '90vh', 
              overflow: 'auto', 
              padding: 32 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: '0 0 8px' }}>Payslip Details</h2>
                <p style={{ margin: 0, color: '#666' }}>
                  {getMonthName(selectedPayslip.payslip.payslip_month)} {selectedPayslip.payslip.payslip_year}
                </p>
              </div>
              <button 
                onClick={() => setShowDetailsModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#fff' }}
              >
                ×
              </button>
            </div>

            {/* Employee Info */}
            <div style={{ marginBottom: 24, padding: 16, background: 'rgba(0, 0, 0, 0.2)', borderRadius: 8 }}>
              <div><strong>Employee:</strong> {selectedPayslip.payslip.employee_name}</div>
              <div><strong>Employee #:</strong> {selectedPayslip.payslip.employee_number}</div>
              <div><strong>Position:</strong> {selectedPayslip.payslip.designation}</div>
              <div><strong>Department:</strong> {selectedPayslip.payslip.employee_department}</div>
            </div>

            {/* Earnings */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>💵 Earnings</h3>
              <table style={{ width: '100%', fontSize: 14 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 0' }}>Basic Salary</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500 }}>
                      {formatCurrency(selectedPayslip.payslip.basic_salary)}
                    </td>
                  </tr>
                  {Object.entries(selectedPayslip.payslip.allowances || {}).map(([key, value]) => (
                    <tr key={key}>
                      <td style={{ padding: '8px 0', paddingLeft: 16 }}>{key}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>{formatCurrency(value as number)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid rgba(255, 255, 255, 0.1)', fontWeight: 600 }}>
                    <td style={{ padding: '8px 0' }}>Gross Salary</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#3b82f6' }}>
                      {formatCurrency(selectedPayslip.payslip.gross_salary)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>➖ Deductions</h3>
              <table style={{ width: '100%', fontSize: 14 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 0' }}>EPF Employee ({selectedPayslip.payslip.epf_employee_rate}%)</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>
                      {formatCurrency(selectedPayslip.payslip.epf_employee_deduction)}
                    </td>
                  </tr>
                  {Object.entries(selectedPayslip.payslip.other_deductions || {}).map(([key, value]) => (
                    <tr key={key}>
                      <td style={{ padding: '8px 0' }}>{key}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>{formatCurrency(value as number)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid rgba(255, 255, 255, 0.1)', fontWeight: 600 }}>
                    <td style={{ padding: '8px 0' }}>Total Deductions</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#ef4444' }}>
                      {formatCurrency(selectedPayslip.payslip.total_deductions)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Net Salary */}
            <div style={{ padding: 20, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>Net Salary</span>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>
                  {formatCurrency(selectedPayslip.payslip.net_salary)}
                </span>
              </div>
            </div>

            {/* Employer Contributions */}
            <div style={{ marginBottom: 24, padding: 16, background: 'rgba(0, 0, 0, 0.2)', borderRadius: 8 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>🏢 Employer Contributions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
                <div>
                  <div style={{ color: '#666' }}>EPF Employer (12%)</div>
                  <div style={{ fontWeight: 500 }}>{formatCurrency(selectedPayslip.payslip.epf_employer_contribution)}</div>
                </div>
                <div>
                  <div style={{ color: '#666' }}>ETF Employer (3%)</div>
                  <div style={{ fontWeight: 500 }}>{formatCurrency(selectedPayslip.payslip.etf_employer_contribution)}</div>
                </div>
              </div>
            </div>

            {/* Signatures */}
            {selectedPayslip.signatures.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>✍️ Signature Trail</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  {selectedPayslip.signatures.map((sig) => (
                    <div key={sig.signature_id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, background: 'rgba(0, 0, 0, 0.1)', borderRadius: 4 }}>
                      <span>
                        <strong>{sig.signer_role.replace(/_/g, ' ')}</strong>: {sig.signer_name}
                      </span>
                      <span style={{ color: '#666', fontSize: 13 }}>
                        {new Date(sig.signed_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="btn-primary"
                style={{ background: '#6b7280' }}
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadPayslip(
                  selectedPayslip.payslip.payslip_id,
                  selectedPayslip.payslip.payslip_month,
                  selectedPayslip.payslip.payslip_year
                )}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={16} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
