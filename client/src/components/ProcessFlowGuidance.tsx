import React, { useState } from 'react'
import { HelpCircle, ChevronRight, X } from 'lucide-react'

type ProcessStep = {
  icon: React.ReactNode
  label: string
  onClick?: () => void
}

type ProcessFlowGuidanceProps = {
  steps: ProcessStep[]
  description: string
  title?: string
  mode?: 'modal' | 'inline'
}

export const ProcessFlowGuidance: React.FC<ProcessFlowGuidanceProps> = ({ steps, description, title = 'Process Flow Guidance', mode = 'modal' }) => {
  const [isOpen, setIsOpen] = useState(false)

  const renderContent = () => (
    <div 
      className={mode === 'modal' ? "glass-panel" : ""}
      style={{ 
        width: '100%', 
        maxWidth: mode === 'modal' ? 900 : '100%', 
        padding: 32, 
        borderRadius: 24, 
        background: '#fff',
        position: 'relative',
        margin: mode === 'modal' ? '0 16px' : 0,
        boxShadow: mode === 'modal' ? '0 20px 60px rgba(0,0,0,0.2)' : 'none',
        border: mode === 'inline' ? '1px solid #eee' : 'none'
      }}
      onClick={e => e.stopPropagation()}
    >
      {mode === 'modal' && (
        <button
          onClick={() => setIsOpen(false)}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#999',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <X size={24} />
        </button>
      )}

      <h3 style={{ margin: '0 0 32px', fontSize: '24px', color: 'var(--primary)', fontWeight: 700 }}>{title}</h3>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', color: '#555', marginBottom: 32 }}>
        {steps.map((step, idx) => (
          <React.Fragment key={idx}>
            <div 
              onClick={() => {
                if (step.onClick) {
                  step.onClick()
                  setIsOpen(false)
                }
              }}
              style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              background: 'var(--primary)', 
              color: '#fff',
              padding: '10px 16px', 
              borderRadius: 30,
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
              cursor: step.onClick ? 'pointer' : 'default',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={e => step.onClick && (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => step.onClick && (e.currentTarget.style.transform = 'scale(1)')}
            >
              {step.icon}
              <span>{step.label}</span>
            </div>
            {idx < steps.length - 1 && <ChevronRight size={24} color="#ccc" />}
          </React.Fragment>
        ))}
      </div>

      <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 12, borderLeft: '4px solid var(--accent)' }}>
        <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--text-main)', fontSize: '15px' }}>
          {description}
        </p>
      </div>
    </div>
  )

  if (mode === 'inline') {
    return renderContent()
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        title="Help"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '8px 16px',
          borderRadius: 8,
          border: 'none',
          background: 'var(--primary)',
          color: '#fff',
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginLeft: 12,
          fontSize: 14,
          fontWeight: 600
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <HelpCircle size={16} />
        <span>Help</span>
      </button>

      {isOpen && (
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
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setIsOpen(false)}
        >
          {renderContent()}
        </div>
      )}
    </>
  )
}
