import { useState } from 'react'
import { FileText, CheckCircle, UserCheck, Archive, BarChart3 } from 'lucide-react'
import PayslipGenerator from '../components/PayslipGenerator'
import PayslipReview from '../components/PayslipReview'
import PayslipAdminApproval from '../components/PayslipAdminApproval'
import PayslipArchive from '../components/PayslipArchive'
import PayrollReports from '../components/PayrollReports'

type PayrollSubTab = 'generate' | 'review' | 'approval' | 'archive' | 'reports'

export default function Payroll() {
  const [subTab, setSubTab] = useState<PayrollSubTab>('generate')

  return (
    <div style={{ width: '100%', display: 'grid', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, marginBottom: 8, fontSize: 32 }}>Payroll Management</h1>
        <p style={{ margin: 0, color: '#666', fontSize: 16 }}>
          Manage employee payslips, approvals, and payroll reports
        </p>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="glass-panel" style={{ padding: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setSubTab('generate')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px',
            borderRadius: 8,
            border: 'none',
            background: subTab === 'generate' ? 'var(--primary)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            transition: 'all 0.2s'
          }}
        >
          <FileText size={18} />
          <span>Generate Payslips</span>
        </button>
        <button
          onClick={() => setSubTab('review')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px',
            borderRadius: 8,
            border: 'none',
            background: subTab === 'review' ? 'var(--primary)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            transition: 'all 0.2s'
          }}
        >
          <CheckCircle size={18} />
          <span>Staff Review</span>
        </button>
        <button
          onClick={() => setSubTab('approval')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px',
            borderRadius: 8,
            border: 'none',
            background: subTab === 'approval' ? 'var(--primary)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            transition: 'all 0.2s'
          }}
        >
          <UserCheck size={18} />
          <span>Admin Approval</span>
        </button>
        <button
          onClick={() => setSubTab('archive')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px',
            borderRadius: 8,
            border: 'none',
            background: subTab === 'archive' ? 'var(--primary)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            transition: 'all 0.2s'
          }}
        >
          <Archive size={18} />
          <span>Archive</span>
        </button>
        <button
          onClick={() => setSubTab('reports')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px',
            borderRadius: 8,
            border: 'none',
            background: subTab === 'reports' ? 'var(--primary)' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            transition: 'all 0.2s'
          }}
        >
          <BarChart3 size={18} />
          <span>Reports</span>
        </button>
      </div>

      {/* Content Area */}
      <div>
        {subTab === 'generate' && <PayslipGenerator />}
        {subTab === 'review' && <PayslipReview />}
        {subTab === 'approval' && <PayslipAdminApproval />}
        {subTab === 'archive' && <PayslipArchive />}
        {subTab === 'reports' && <PayrollReports />}
      </div>
    </div>
  )
}
