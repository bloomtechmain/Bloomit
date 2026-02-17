import { useState } from 'react'
import { API_URL } from '../config/api'

type FormState = {
  email: string
  password: string
}

type Errors = Partial<FormState>

type User = {
  id: number
  name: string
  email: string
  roleId: number | null
  roleName: string | null
  permissions: string[]
  password_must_change?: boolean
}

export default function Login({ onLoggedIn }: { onLoggedIn?: (user: User, accessToken: string, refreshToken: string) => void }) {
  const [form, setForm] = useState<FormState>({ email: '', password: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  
  // Password change modal state
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false)
  const [passwordChangeData, setPasswordChangeData] = useState<{user: User; accessToken: string; refreshToken: string} | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const validate = (state: FormState) => {
    const e: Errors = {}
    if (!state.email) e.email = 'Email or username is required'
    else {
      const isEmail = state.email.includes('@')
      if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) e.email = 'Invalid email'
    }
    if (!state.password) e.password = 'Password is required'
    else if (state.password.length < 6) e.password = 'Minimum 6 characters'
    return e
  }

  const onChange = (key: keyof FormState) => (ev: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [key]: ev.target.value }))
  }

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = (data && data.error) || 'Login failed'
        alert(msg)
        return
      }
      const data = await res.json()
      if (onLoggedIn && data.user && data.accessToken && data.refreshToken) {
        // Check if user needs to change password
        if (data.user.password_must_change) {
          setPasswordChangeData({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken
          })
          setShowPasswordChangeModal(true)
        } else {
          onLoggedIn(data.user, data.accessToken, data.refreshToken)
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!passwordChangeData) return
    
    // Reset errors
    setPasswordError('')
    
    // Validation
    if (!newPassword || !confirmPassword) {
      setPasswordError('Both fields are required')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    
    if (newPassword.length < 10) {
      setPasswordError('Password must be at least 10 characters')
      return
    }
    
    setChangingPassword(true)
    
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${passwordChangeData.accessToken}`
        },
        body: JSON.stringify({
          currentPassword: form.password,
          newPassword
        })
      })
      
      if (!res.ok) {
        const data = await res.json()
        setPasswordError(data.message || 'Failed to change password')
        return
      }
      
      // Success - close modal and continue with login
      setShowPasswordChangeModal(false)
      if (onLoggedIn) {
        onLoggedIn(passwordChangeData.user, passwordChangeData.accessToken, passwordChangeData.refreshToken)
      }
    } catch (e) {
      setPasswordError('Error changing password')
    } finally {
      setChangingPassword(false)
    }
  }
  
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '', color: '#ccc' }
    
    let strength = 0
    if (password.length >= 10) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    
    if (strength < 3) return { strength, text: 'Weak', color: '#f44336' }
    if (strength < 5) return { strength, text: 'Medium', color: '#ff9800' }
    return { strength, text: 'Strong', color: '#4CAF50' }
  }
  
  const passwordStrength = getPasswordStrength(newPassword)
  
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', overflow: 'hidden' }}>
      <form onSubmit={onSubmit} style={{ width: 'min(520px, 92vw)', padding: 32, borderRadius: 16, background: '#063062', color: '#111', border: '1px solid var(--primary)', boxShadow: '0 12px 24px rgba(0,0,0,0.2)' }}>
        <h1 style={{ margin: 0, marginBottom: 20, fontSize: 28 , color: '#e21818ff'}}>Login</h1>
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ color: '#fff' }}>Email or username</span>
            <input
              type="text"
              value={form.email}
              onChange={onChange('email')}
              placeholder="email or username"
              style={{ padding: '12px 14px',fontSize: 16, borderRadius: 10, border: '1px solid var(--primary)', background: '#fff', color: '#111' }}
            />
            {errors.email && (
              <span style={{ color: '#ff6b6b', fontSize: 12 }}>{errors.email}</span>
            )}
          </label>
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ color: '#fff' }}>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={onChange('password')}
              placeholder="••••••"
              style={{ padding: '12px 14px', fontSize: 16, borderRadius: 10, border: '1px solid var(--primary)', background: '#fff', color: '#111' }}
            />
            {errors.password && (
              <span style={{ color: '#ff6b6b', fontSize: 12 }}>{errors.password}</span>
            )}
          </label>
          <button
            type="submit"
            disabled={submitting}
            style={{ marginTop: 10, padding: '12px 14px', fontSize: 16, width: '100%', borderRadius: 10, border: '1px solid var(--primary)', background: submitting ? '#b1b1b1' : 'var(--accent)', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>
      
      {/* Password Change Required Modal */}
      {showPasswordChangeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ width: 'min(500px, 92vw)', padding: 32, borderRadius: 16, background: '#063062', border: '1px solid var(--primary)', boxShadow: '0 12px 24px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: '#e21818ff' }}>Password Change Required</h2>
            </div>
            
            <p style={{ color: '#fff', marginBottom: 20 }}>
              For security, you must change your temporary password before continuing.
            </p>
            
            <div style={{ display: 'grid', gap: 16 }}>
              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ color: '#fff', fontWeight: 500 }}>New Password *</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={{ padding: '12px 14px', fontSize: 16, borderRadius: 10, border: '1px solid var(--primary)', background: '#fff', color: '#111' }}
                />
                {newPassword && (
                  <div style={{ fontSize: 12, color: passwordStrength.color }}>
                    Password Strength: {passwordStrength.text}
                  </div>
                )}
              </label>
              
              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ color: '#fff', fontWeight: 500 }}>Confirm New Password *</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  style={{ padding: '12px 14px', fontSize: 16, borderRadius: 10, border: '1px solid var(--primary)', background: '#fff', color: '#111' }}
                />
              </label>
              
              <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: 12, fontSize: 13, color: '#856404' }}>
                <strong>Password Requirements:</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                  <li>At least 10 characters long</li>
                  <li>Contains uppercase and lowercase letters</li>
                  <li>Contains at least one number</li>
                  <li>Contains at least one special symbol</li>
                  <li>Cannot match your last 3 passwords</li>
                </ul>
              </div>
              
              {passwordError && (
                <div style={{ padding: '12px', background: '#f443364d', border: '1px solid #f44336', borderRadius: 8, color: '#ff6b6b', fontSize: 14 }}>
                  {passwordError}
                </div>
              )}
              
              <button
                onClick={handlePasswordChange}
                disabled={changingPassword || !newPassword || !confirmPassword}
                style={{
                  marginTop: 10,
                  padding: '12px 14px',
                  fontSize: 16,
                  width: '100%',
                  borderRadius: 10,
                  border: 'none',
                  background: (changingPassword || !newPassword || !confirmPassword) ? '#b1b1b1' : 'var(--accent)',
                  color: '#fff',
                  cursor: (changingPassword || !newPassword || !confirmPassword) ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                {changingPassword ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
