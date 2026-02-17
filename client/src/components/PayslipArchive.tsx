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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function PayslipArchive() {
  const [archive, setArchive] = useState<ArchiveEntry[]>([])
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPayslips, setLoadingPayslips] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedYear, setExpandedYear] = useState<number | null>(null)

  // Fetch archive data
  useEffect(() => {
    fetchArchive()
  }, [])

  // Fetch payslips when year/month is selected
  useEffect(() => {
    if (selectedYear && selectedMonth) {
      fetchPayslipsForMonth(selectedYear, selectedMonth)
    }
  }, [selectedYear, selectedMonth])

  const fetchArchive = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/payroll/archive`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setArchive(data.archive)
        
        // Auto-select most recent year/month
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
      const response = await fetch(
        `${API_URL}/payroll/payslips?year=${year}&month=${month}&status=COMPLETED`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

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
      const response = await fetch(
        `${API_URL}/payroll/payslips/${payslipId}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

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

  // Group archive by year
  const archiveByYear = archive.reduce((acc, entry) => {
    if (!acc[entry.payslip_year]) {
      acc[entry.payslip_year] = []
    }
    acc[entry.payslip_year].push(entry)
    return acc
  }, {} as Record<number, ArchiveEntry[]>)

  const years = Object.keys(archiveByYear).map(Number).sort((a, b) => b - a)

  // Filter payslips by search term
  const filteredPayslips = payslips.filter(p => {
    const searchLower = searchTerm.toLowerCase()
    return (
      p.first_name.toLowerCase().includes(searchLower) ||
      p.last_name.toLowerCase().includes(searchLower) ||
      p.employee_number.toLowerCase().includes(searchLower) ||
      (p.employee_department && p.employee_department.toLowerCase().includes(searchLower))
    )
  })

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(amount))
  }

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: '#666' }}>Loading archive...</div>
      </div>
    )
  }

  if (archive.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
        <ArchiveIcon size={64} style={{ color: '#ccc', marginBottom: 16 }} />
        <h3 style={{ margin: 0, marginBottom: 8 }}>No Archived Payslips</h3>
        <p style={{ margin: 0, color: '#666' }}>
          Completed payslips will appear here for download.
        </p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', display: 'grid', gap: 24 }}>
      {/* Year/Month Navigation */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h3 style={{ margin: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={20} />
          Payslip Archive
        </h3>

        <div style={{ display: 'grid', gap: 12 }}>
          {years.map(year => (
            <div key={year} style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              {/* Year header */}
              <button
                onClick={() => setExpandedYear(expandedYear === year ? null : year)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: expandedYear === year ? '#f3f4f6' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 600
                }}
              >
                <span>{year}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, color: '#666', fontWeight: 400 }}>
                    {archiveByYear[year].length} {archiveByYear[year].length === 1 ? 'month' : 'months'}
                  </span>
                  {expandedYear === year ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {/* Month list */}
              {expandedYear === year && (
                <div style={{ padding: '8px 0', background: '#fafafa' }}>
                  {archiveByYear[year]
                    .sort((a, b) => b.payslip_month - a.payslip_month)
                    .map(entry => (
                      <button
                        key={`${entry.payslip_year}-${entry.payslip_month}`}
                        onClick={() => {
                          setSelectedYear(entry.payslip_year)
                          setSelectedMonth(entry.payslip_month)
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 24px',
                          background:
                            selectedYear === entry.payslip_year && selectedMonth === entry.payslip_month
                              ? 'var(--primary)'
                              : 'transparent',
                          color:
                            selectedYear === entry.payslip_year && selectedMonth === entry.payslip_month
                              ? '#fff'
                              : '#333',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 14,
                          textAlign: 'left',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontWeight: 500, minWidth: 100 }}>
                            {MONTHS[entry.payslip_month - 1]}
                          </span>
                          <span style={{ opacity: 0.8, fontSize: 13 }}>
                            {entry.payslip_count} {entry.payslip_count === '1' ? 'payslip' : 'payslips'}
                          </span>
                        </div>
                        <span style={{ fontSize: 13, opacity: 0.8 }}>
                          {formatCurrency(entry.total_net_salary)}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payslips List */}
      {selectedYear && selectedMonth && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, marginBottom: 16 }}>
              {MONTHS[selectedMonth - 1]} {selectedYear} Payslips
            </h3>

            {/* Search bar */}
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }}
              />
              <input
                type="text"
                placeholder="Search by employee name, number, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 14
                }}
              />
            </div>
          </div>

          {loadingPayslips ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
              Loading payslips...
            </div>
          ) : filteredPayslips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
              {searchTerm ? 'No payslips match your search.' : 'No payslips found for this month.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {/* Header row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto',
                  gap: 12,
                  padding: '12px 16px',
                  background: '#f3f4f6',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#666'
                }}
              >
                <div>Employee Number</div>
                <div>Name</div>
                <div>Department</div>
                <div style={{ textAlign: 'right' }}>Gross Salary</div>
                <div style={{ textAlign: 'right' }}>Net Salary</div>
                <div style={{ textAlign: 'center', minWidth: 100 }}>Action</div>
              </div>

              {/* Payslip rows */}
              {filteredPayslips.map(payslip => (
                <div
                  key={payslip.payslip_id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto',
                    gap: 12,
                    padding: '16px',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    alignItems: 'center',
                    fontSize: 14
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{payslip.employee_number}</div>
                  <div>
                    {payslip.first_name} {payslip.last_name}
                  </div>
                  <div style={{ color: '#666' }}>{payslip.employee_department || 'N/A'}</div>
                  <div style={{ textAlign: 'right', fontWeight: 500 }}>
                    {formatCurrency(payslip.gross_salary)}
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                    {formatCurrency(payslip.net_salary)}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={() =>
                        handleDownload(
                          payslip.payslip_id,
                          payslip.employee_number,
                          payslip.payslip_month,
                          payslip.payslip_year
                        )
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        background: 'var(--primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
                      onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {!loadingPayslips && filteredPayslips.length > 0 && (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 8,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                  <Users size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Total Employees
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#0369a1' }}>
                  {filteredPayslips.length}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                  <DollarSign size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Total Gross Salary
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#0369a1' }}>
                  {formatCurrency(
                    filteredPayslips.reduce((sum, p) => sum + parseFloat(p.gross_salary), 0).toString()
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                  <DollarSign size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Total Net Salary
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#16a34a' }}>
                  {formatCurrency(
                    filteredPayslips.reduce((sum, p) => sum + parseFloat(p.net_salary), 0).toString()
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
