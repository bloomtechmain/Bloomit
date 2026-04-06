import { useState, useEffect } from 'react'
import { Download, Calendar, Users, DollarSign, Search, ChevronDown, ChevronUp, Archive as ArchiveIcon } from 'lucide-react'
import { API_URL } from '../config/api'

interface ArchiveEntry {
  payslip_year: number
  payslip_month: number
  payslip_count: string
  total_net_salary: string
  total_gross_salary: string
}

interface Payslip {
  payslip_id: number
  employee_id: number
  first_name: string
  last_name: string
  employee_number: string
  employee_department: string
  payslip_month: number
  payslip_year: number
  gross_salary: string
  net_salary: string
  status: string
  created_at: string
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const card: React.CSSProperties = {
  background: '#fff',
  border: '1.5px solid #e2e8f0',
  borderRadius: 12,
  padding: 24,
  boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
}

const formatCurrency = (amount: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(amount))

export default function PayslipArchive() {
  const [archive, setArchive] = useState<ArchiveEntry[]>([])
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPayslips, setLoadingPayslips] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedYear, setExpandedYear] = useState<number | null>(null)

  useEffect(() => { fetchArchive() }, [])

  useEffect(() => {
    if (selectedYear && selectedMonth) fetchPayslipsForMonth(selectedYear, selectedMonth)
  }, [selectedYear, selectedMonth])

  const fetchArchive = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/payroll/archive`, { headers: { Authorization: `Bearer ${token}` } })
      if (response.ok) {
        const data = await response.json()
        setArchive(data.archive)
        if (data.archive.length > 0) {
          const mostRecent = data.archive[0]
          setSelectedYear(mostRecent.payslip_year)
          setSelectedMonth(mostRecent.payslip_month)
          setExpandedYear(mostRecent.payslip_year)
        }
      }
    } catch (error) {
      console.error('Error fetching archive:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPayslipsForMonth = async (year: number, month: number) => {
    try {
      setLoadingPayslips(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/payroll/payslips?year=${year}&month=${month}&status=COMPLETED`, { headers: { Authorization: `Bearer ${token}` } })
      if (response.ok) {
        const data = await response.json()
        setPayslips(data.payslips)
      }
    } catch (error) {
      console.error('Error fetching payslips:', error)
    } finally {
      setLoadingPayslips(false)
    }
  }

  const handleDownload = async (payslipId: number, employeeNumber: string, month: number, year: number) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/payroll/payslips/${payslipId}/download`, { headers: { Authorization: `Bearer ${token}` } })
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Payslip_${employeeNumber}_${MONTHS[month - 1]}_${year}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to download payslip')
      }
    } catch (error) {
      console.error('Error downloading payslip:', error)
      alert('Error downloading payslip')
    }
  }

  const archiveByYear = archive.reduce((acc, entry) => {
    if (!acc[entry.payslip_year]) acc[entry.payslip_year] = []
    acc[entry.payslip_year].push(entry)
    return acc
  }, {} as Record<number, ArchiveEntry[]>)

  const years = Object.keys(archiveByYear).map(Number).sort((a, b) => b - a)

  const filteredPayslips = payslips.filter(p => {
    const s = searchTerm.toLowerCase()
    return p.first_name.toLowerCase().includes(s) || p.last_name.toLowerCase().includes(s) || p.employee_number.toLowerCase().includes(s) || (p.employee_department && p.employee_department.toLowerCase().includes(s))
  })

  if (loading) {
    return (
      <div style={{ ...card, padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Loading archive...</p>
      </div>
    )
  }

  if (archive.length === 0) {
    return (
      <div style={{ ...card, padding: 48, textAlign: 'center' }}>
        <ArchiveIcon size={48} style={{ color: '#cbd5e1', marginBottom: 12 }} />
        <h3 style={{ margin: '0 0 6px', color: '#475569' }}>No Archived Payslips</h3>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 13.5 }}>Completed payslips will appear here for download.</p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', display: 'grid', gap: 20 }}>
      {/* Year/Month Navigation */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={13} color="#6366f1" />
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Payslip Archive</span>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {years.map(year => (
            <div key={year} style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => setExpandedYear(expandedYear === year ? null : year)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', background: expandedYear === year ? '#f1f5f9' : '#fff', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#1e293b', transition: 'background 0.15s' }}
              >
                <span>{year}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 400 }}>
                    {archiveByYear[year].length} {archiveByYear[year].length === 1 ? 'month' : 'months'}
                  </span>
                  {expandedYear === year ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#94a3b8" />}
                </div>
              </button>

              {expandedYear === year && (
                <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                  {archiveByYear[year].sort((a, b) => b.payslip_month - a.payslip_month).map(entry => {
                    const isSelected = selectedYear === entry.payslip_year && selectedMonth === entry.payslip_month
                    return (
                      <button
                        key={`${entry.payslip_year}-${entry.payslip_month}`}
                        onClick={() => { setSelectedYear(entry.payslip_year); setSelectedMonth(entry.payslip_month) }}
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: isSelected ? '#3b82f6' : 'transparent', color: isSelected ? '#fff' : '#374151', border: 'none', cursor: 'pointer', fontSize: 13.5, transition: 'all 0.15s', textAlign: 'left' }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#eff6ff' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontWeight: 600, minWidth: 90 }}>{MONTHS[entry.payslip_month - 1]}</span>
                          <span style={{ opacity: 0.7, fontSize: 12.5 }}>{entry.payslip_count} {entry.payslip_count === '1' ? 'payslip' : 'payslips'}</span>
                        </div>
                        <span style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 600 }}>{formatCurrency(entry.total_net_salary)}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payslips List */}
      {selectedYear && selectedMonth && (
        <div style={card}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArchiveIcon size={13} color="#6366f1" />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>
                {MONTHS[selectedMonth - 1]} {selectedYear} Payslips
              </span>
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search by employee name, number, or department..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 14px 10px 36px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13.5, background: '#f8fafc', outline: 'none', boxSizing: 'border-box' as const, transition: 'all 0.2s' }}
                onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)' }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }}
              />
            </div>
          </div>

          {loadingPayslips ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 14 }}>Loading payslips...</div>
          ) : filteredPayslips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, background: '#f8fafc', borderRadius: 10, color: '#94a3b8', fontSize: 14 }}>
              {searchTerm ? 'No payslips match your search.' : 'No payslips found for this month.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 12, padding: '10px 16px', background: '#f8fafc', borderRadius: 8, fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <div>Emp. Number</div>
                <div>Name</div>
                <div>Department</div>
                <div style={{ textAlign: 'right' }}>Gross</div>
                <div style={{ textAlign: 'right' }}>Net</div>
                <div style={{ textAlign: 'center', minWidth: 100 }}>Action</div>
              </div>

              {filteredPayslips.map(payslip => (
                <div
                  key={payslip.payslip_id}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 12, padding: '13px 16px', background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: 9, alignItems: 'center', fontSize: 13.5, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fafcff' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = '#fff' }}
                >
                  <div style={{ fontWeight: 600, color: '#475569', fontSize: 12.5 }}>{payslip.employee_number}</div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{payslip.first_name} {payslip.last_name}</div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{payslip.employee_department || 'N/A'}</div>
                  <div style={{ textAlign: 'right', fontWeight: 500, color: '#374151' }}>{formatCurrency(payslip.gross_salary)}</div>
                  <div style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>{formatCurrency(payslip.net_salary)}</div>
                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => handleDownload(payslip.payslip_id, payslip.employee_number, payslip.payslip_month, payslip.payslip_year)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(59,130,246,0.25)' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 10px rgba(59,130,246,0.4)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 6px rgba(59,130,246,0.25)'}
                    >
                      <Download size={13} />Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {!loadingPayslips && filteredPayslips.length > 0 && (
            <div style={{ marginTop: 16, padding: 16, background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Users size={12} />Total Employees
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0369a1' }}>{filteredPayslips.length}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <DollarSign size={12} />Total Gross
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0369a1' }}>
                  {formatCurrency(filteredPayslips.reduce((sum, p) => sum + parseFloat(p.gross_salary), 0).toString())}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <DollarSign size={12} />Total Net
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>
                  {formatCurrency(filteredPayslips.reduce((sum, p) => sum + parseFloat(p.net_salary), 0).toString())}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
