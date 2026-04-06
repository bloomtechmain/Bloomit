import { useState } from 'react'
import { FileText, CheckCircle, UserCheck, Archive, BarChart3, DollarSign, Users, Calculator } from 'lucide-react'
import PayslipGenerator from '../components/PayslipGenerator'
import PayslipReview from '../components/PayslipReview'
import PayslipAdminApproval from '../components/PayslipAdminApproval'
import PayslipArchive from '../components/PayslipArchive'
import PayrollReports from '../components/PayrollReports'

type PayrollSubTab = 'generate' | 'review' | 'approval' | 'archive' | 'reports'

export default function Payroll() {
  const [subTab, setSubTab] = useState<PayrollSubTab>('generate')

  return (
    <div style={{ width: '100%', display: 'grid', gap: 24, position: 'relative' }}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
        <DollarSign size={520} strokeWidth={0.7} style={{ position: 'absolute', right: -120, top: -80, opacity: 0.05, color: '#3b82f6', transform: 'rotate(-12deg)' }} />
        <UserCheck size={380} strokeWidth={0.7} style={{ position: 'absolute', left: -60, bottom: -40, opacity: 0.04, color: '#60a5fa', transform: 'rotate(10deg)' }} />
        <FileText size={300} strokeWidth={0.7} style={{ position: 'absolute', left: '38%', top: '30%', opacity: 0.03, color: '#93c5fd', transform: 'translateX(-50%)' }} />
        <BarChart3 size={200} strokeWidth={0.7} style={{ position: 'absolute', left: '5%', top: '5%', opacity: 0.04, color: '#60a5fa', transform: 'rotate(-6deg)' }} />
        <Users size={220} strokeWidth={0.7} style={{ position: 'absolute', right: '4%', top: '35%', opacity: 0.04, color: '#3b82f6', transform: 'rotate(-8deg)' }} />
        <Calculator size={240} strokeWidth={0.7} style={{ position: 'absolute', right: '6%', bottom: '8%', opacity: 0.04, color: '#93c5fd', transform: 'rotate(6deg)' }} />
        <DollarSign size={180} strokeWidth={0.7} style={{ position: 'absolute', left: '2%', top: '45%', opacity: 0.03, color: '#60a5fa' }} />
      </div>

      {/* Sub-navigation Tabs */}
      <div style={{
        background: '#fff',
        border: '1.5px solid #e2e8f0',
        borderRadius: 14,
        padding: 8,
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        boxShadow: '0 2px 8px rgba(15,23,42,0.06)'
      }}>
        {([
          { key: 'generate', label: 'Generate Payslips', icon: <FileText size={16} /> },
          { key: 'review',   label: 'Staff Review',      icon: <CheckCircle size={16} /> },
          { key: 'approval', label: 'Admin Approval',    icon: <UserCheck size={16} /> },
          { key: 'archive',  label: 'Archive',           icon: <Archive size={16} /> },
          { key: 'reports',  label: 'Reports',           icon: <BarChart3 size={16} /> },
        ] as { key: PayrollSubTab; label: string; icon: React.ReactNode }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '10px 18px',
              borderRadius: 9,
              border: 'none',
              background: subTab === tab.key ? '#3b82f6' : '#f1f5f9',
              color: subTab === tab.key ? '#fff' : '#64748b',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13.5,
              transition: 'all 0.2s',
              boxShadow: subTab === tab.key ? '0 2px 8px rgba(59,130,246,0.3)' : 'none',
            }}
            onMouseEnter={e => { if (subTab !== tab.key) e.currentTarget.style.background = '#e2e8f0' }}
            onMouseLeave={e => { if (subTab !== tab.key) e.currentTarget.style.background = '#f1f5f9' }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
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
