export const ProjectSkeleton = () => {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '1.25rem',
        marginBottom: '1rem',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }}
    >
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div
          style={{
            width: '20px',
            height: '20px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px'
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: '24px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              marginBottom: '0.5rem',
              width: '40%'
            }}
          />
          <div
            style={{
              height: '16px',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              marginBottom: '0.75rem',
              width: '70%'
            }}
          />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div
              style={{
                height: '14px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                width: '80px'
              }}
            />
            <div
              style={{
                height: '14px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                width: '120px'
              }}
            />
            <div
              style={{
                height: '14px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                width: '100px'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export const ContractSkeleton = () => {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: '1rem',
        marginBottom: '0.75rem',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }}
    >
      <div style={{ marginBottom: '0.75rem' }}>
        <div
          style={{
            height: '20px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            marginBottom: '0.5rem',
            width: '50%'
          }}
        />
        <div
          style={{
            height: '14px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            width: '40%'
          }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div
              style={{
                height: '12px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                marginBottom: '0.25rem'
              }}
            />
            <div
              style={{
                height: '16px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// Add CSS animation styles
const style = document.createElement('style')
style.textContent = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`
document.head.appendChild(style)
