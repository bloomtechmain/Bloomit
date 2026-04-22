import { useState } from 'react'
import { Shield, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [sessionConflict, setSessionConflict] = useState(false)

  // Password change modal state
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false)
  const [passwordChangeData, setPasswordChangeData] = useState<{ user: User; accessToken: string; refreshToken: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const validate = (state: FormState) => {
    const e: Errors = {}
    if (!state.email) e.email = 'Email or username is required'
    else {
      const isEmail = state.email.includes('@')
      if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) e.email = 'Invalid email address'
    }
    if (!state.password) e.password = 'Password is required'
    return e
  }

  const onChange = (key: keyof FormState) => (ev: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [key]: ev.target.value }))
    setErrors(prev => ({ ...prev, [key]: undefined }))
    setLoginError('')
    setSessionConflict(false)
  }

  const doLogin = async (force = false) => {
    setSubmitting(true)
    setLoginError('')
    setSessionConflict(false)
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, force }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 409) {
          setSessionConflict(true)
          setLoginError((data && data.message) || 'This account is already active in another session.')
        } else {
          setLoginError((data && data.error) === 'invalid_credentials' ? 'Invalid email or password.' : (data && data.message) || 'Login failed. Please try again.')
        }
        return
      }
      const data = await res.json()
      if (onLoggedIn && data.user && data.accessToken && data.refreshToken) {
        if (data.user.password_must_change) {
          setPasswordChangeData({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken })
          setShowPasswordChangeModal(true)
        } else {
          onLoggedIn(data.user, data.accessToken, data.refreshToken)
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length) return
    await doLogin(false)
  }

  const handlePasswordChange = async () => {
    if (!passwordChangeData) return
    setPasswordError('')
    if (!newPassword || !confirmPassword) { setPasswordError('Both fields are required'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return }
    if (newPassword.length < 10) { setPasswordError('Password must be at least 10 characters'); return }
    setChangingPassword(true)
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${passwordChangeData.accessToken}` },
        body: JSON.stringify({ currentPassword: form.password, newPassword }),
      })
      if (!res.ok) {
        const data = await res.json()
        setPasswordError(data.message || 'Failed to change password')
        return
      }
      setShowPasswordChangeModal(false)
      if (onLoggedIn) onLoggedIn(passwordChangeData.user, passwordChangeData.accessToken, passwordChangeData.refreshToken)
    } catch {
      setPasswordError('Error changing password. Please try again.')
    } finally {
      setChangingPassword(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', bars: [false, false, false, false, false] }
    let s = 0
    if (password.length >= 10) s++
    if (/[A-Z]/.test(password)) s++
    if (/[a-z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    const bars = [s >= 1, s >= 2, s >= 3, s >= 4, s >= 5]
    if (s < 3) return { strength: s, label: 'Weak', color: '#ef4444', bars }
    if (s < 5) return { strength: s, label: 'Moderate', color: '#f59e0b', bars }
    return { strength: s, label: 'Strong', color: '#10b981', bars }
  }

  const pwStrength = getPasswordStrength(newPassword)

  const requirements = [
    { met: newPassword.length >= 10, text: 'At least 10 characters' },
    { met: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword), text: 'Uppercase & lowercase letters' },
    { met: /[0-9]/.test(newPassword), text: 'At least one number' },
    { met: /[^A-Za-z0-9]/.test(newPassword), text: 'At least one special character' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .login-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Inter', system-ui, sans-serif;
          background: #0b1628;
        }
        /* ── Left branding panel ── */
        .login-brand {
          display: none;
          flex: 1;
          background: linear-gradient(145deg, #0d1f3c 0%, #112244 50%, #0d2a52 100%);
          padding: 48px 56px;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 900px) { .login-brand { display: flex; } }
        .login-brand::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 15% 85%, rgba(59,130,246,0.12) 0%, transparent 50%),
            radial-gradient(circle at 85% 15%, rgba(99,102,241,0.10) 0%, transparent 50%);
        }
        .brand-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .brand-content { position: relative; z-index: 1; }
        .brand-logo-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 64px;
        }
        .brand-logo-icon {
          width: 48px; height: 48px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(99,102,241,0.4);
        }
        .brand-logo-text { font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
        .brand-logo-sub { font-size: 12px; font-weight: 500; color: #7aa3d4; letter-spacing: 1.5px; text-transform: uppercase; }
        .brand-headline {
          font-size: 38px;
          font-weight: 700;
          color: #fff;
          line-height: 1.2;
          margin-bottom: 20px;
          letter-spacing: -0.5px;
        }
        .brand-headline span { color: #60a5fa; }
        .brand-sub {
          font-size: 16px;
          color: #7aa3d4;
          line-height: 1.7;
          margin-bottom: 48px;
          max-width: 420px;
        }
        .brand-features { display: flex; flex-direction: column; gap: 16px; }
        .brand-feature {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 16px 20px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
        }
        .brand-feature-icon {
          width: 36px; height: 36px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          font-size: 16px;
        }
        .brand-feature-title { font-size: 14px; font-weight: 600; color: #e2e8f0; margin-bottom: 2px; }
        .brand-feature-desc { font-size: 13px; color: #7aa3d4; }
        .brand-footer { font-size: 13px; color: #4a6fa5; }
        /* ── Right form panel ── */
        .login-form-panel {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          background: #0f1e35;
        }
        @media (min-width: 900px) { .login-form-panel { border-left: 1px solid rgba(255,255,255,0.06); } }
        .login-card {
          width: 100%;
          max-width: 420px;
        }
        .form-header { margin-bottom: 36px; }
        .form-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(59,130,246,0.12);
          border: 1px solid rgba(59,130,246,0.25);
          border-radius: 20px;
          padding: 5px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #60a5fa;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .form-title { font-size: 30px; font-weight: 700; color: #f0f6ff; margin: 0 0 8px; letter-spacing: -0.4px; }
        .form-subtitle { font-size: 15px; color: #7aa3d4; }
        .field-group { display: flex; flex-direction: column; gap: 18px; margin-bottom: 24px; }
        .field { display: flex; flex-direction: column; gap: 7px; }
        .field-label { font-size: 13px; font-weight: 600; color: #cbd5e1; letter-spacing: 0.2px; }
        .field-wrapper {
          position: relative;
          display: flex; align-items: center;
        }
        .field-icon {
          position: absolute; left: 14px;
          color: #4a6fa5;
          display: flex; align-items: center;
          pointer-events: none;
        }
        .field-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          font-size: 15px;
          font-family: inherit;
          border-radius: 10px;
          border: 1.5px solid #1e3a5f;
          background: #0d1f3c;
          color: #e2e8f0;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .field-input::placeholder { color: #3b5a8a; }
        .field-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }
        .field-input.has-error { border-color: #ef4444; }
        .field-input.has-error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
        .field-toggle {
          position: absolute; right: 14px;
          background: none; border: none; cursor: pointer;
          color: #4a6fa5; padding: 0; line-height: 1;
          display: flex; align-items: center;
          transition: color 0.2s;
        }
        .field-toggle:hover { color: #7aa3d4; }
        .field-error { font-size: 12px; color: #f87171; display: flex; align-items: center; gap: 5px; }
        .login-alert {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 16px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 10px;
          color: #fca5a5;
          font-size: 14px;
          margin-bottom: 18px;
        }
        .btn-primary {
          width: 100%;
          padding: 13px 20px;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #2563eb, #4f46e5);
          color: #fff;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s;
          box-shadow: 0 4px 16px rgba(37,99,235,0.35);
          letter-spacing: 0.2px;
        }
        .btn-primary:hover:not(:disabled) {
          opacity: 0.92;
          box-shadow: 0 6px 24px rgba(37,99,235,0.45);
        }
        .btn-primary:active:not(:disabled) { transform: scale(0.99); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
        .btn-force {
          width: 100%;
          padding: 11px 20px;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          border-radius: 10px;
          border: 1.5px solid rgba(245,158,11,0.4);
          background: rgba(245,158,11,0.1);
          color: #fbbf24;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
          margin-top: 8px;
        }
        .btn-force:hover { background: rgba(245,158,11,0.18); border-color: rgba(245,158,11,0.6); }
        .conflict-alert {
          display: flex; flex-direction: column; gap: 10px;
          padding: 14px 16px;
          background: rgba(245,158,11,0.08);
          border: 1px solid rgba(245,158,11,0.3);
          border-radius: 10px;
          margin-bottom: 18px;
        }
        .conflict-alert-row { display: flex; align-items: flex-start; gap: 10px; color: #fbbf24; font-size: 14px; }
        .conflict-alert-hint { font-size: 12px; color: #92400e; padding-left: 26px; }
        .form-footer {
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: #4a6fa5;
        }
        /* ── Password change modal ── */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(5,12,26,0.85);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999;
          padding: 24px;
        }
        .modal-card {
          width: 100%; max-width: 480px;
          background: #0f1e35;
          border: 1px solid #1e3a5f;
          border-radius: 20px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.5);
          overflow: hidden;
        }
        .modal-header {
          padding: 24px 28px 20px;
          border-bottom: 1px solid #1a2f50;
          display: flex; align-items: center; gap: 14px;
        }
        .modal-header-icon {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(245,158,11,0.35);
          flex-shrink: 0;
        }
        .modal-title { font-size: 18px; font-weight: 700; color: #f0f6ff; margin: 0 0 3px; }
        .modal-subtitle { font-size: 13px; color: #7aa3d4; }
        .modal-body { padding: 24px 28px; display: flex; flex-direction: column; gap: 18px; }
        .strength-bars { display: flex; gap: 4px; margin-top: 6px; }
        .strength-bar {
          height: 4px; flex: 1; border-radius: 4px;
          background: #1e3a5f;
          transition: background 0.3s;
        }
        .req-list { display: flex; flex-direction: column; gap: 7px; }
        .req-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .req-text-met { color: #6ee7b7; }
        .req-text-unmet { color: #4a6fa5; }
        .modal-error {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 11px 14px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 8px;
          color: #fca5a5;
          font-size: 13px;
        }
      `}</style>

      <div className="login-root">
        {/* ── Left branding panel ── */}
        <div className="login-brand">
          <div className="brand-grid" />
          <div className="brand-content">
            <div className="brand-logo-row">
              <div className="brand-logo-icon">
                <Shield size={24} color="#fff" />
              </div>
              <div>
                <div className="brand-logo-text">BloomERP</div>
                <div className="brand-logo-sub">Audit & Compliance Suite</div>
              </div>
            </div>

            <div>
              <h1 className="brand-headline">
                Enterprise Audit<br />
                <span>Made Transparent</span>
              </h1>
              <p className="brand-sub">
                A unified platform for financial oversight, compliance tracking, and operational audit — built for organizations that demand accuracy.
              </p>

              <div className="brand-features">
                {[
                  { icon: '🔍', color: 'rgba(59,130,246,0.15)', title: 'Full Audit Trail', desc: 'Every action logged with timestamp, user, and context' },
                  { icon: '📊', color: 'rgba(99,102,241,0.15)', title: 'Real-Time Financials', desc: 'Payables, receivables, and payroll in one dashboard' },
                  { icon: '🛡️', color: 'rgba(16,185,129,0.15)', title: 'Role-Based Access', desc: 'Granular permissions to protect sensitive data' },
                ].map(f => (
                  <div className="brand-feature" key={f.title}>
                    <div className="brand-feature-icon" style={{ background: f.color }}>{f.icon}</div>
                    <div>
                      <div className="brand-feature-title">{f.title}</div>
                      <div className="brand-feature-desc">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="brand-footer">
            © {new Date().getFullYear()} BloomERP · Secure · Compliant · Reliable
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="login-form-panel">
          <div className="login-card">
            <div className="form-header">
              <div className="form-badge">
                <Shield size={12} />
                Secure Access
              </div>
              <h2 className="form-title">Welcome back</h2>
              <p className="form-subtitle">Sign in to your audit workspace</p>
            </div>

            <form onSubmit={onSubmit}>
              <div className="field-group">
                <div className="field">
                  <label className="field-label">Email address</label>
                  <div className="field-wrapper">
                    <span className="field-icon"><Mail size={16} /></span>
                    <input
                      className={`field-input${errors.email ? ' has-error' : ''}`}
                      type="text"
                      value={form.email}
                      onChange={onChange('email')}
                      placeholder="you@company.com"
                      autoComplete="email"
                      spellCheck={false}
                    />
                  </div>
                  {errors.email && (
                    <span className="field-error"><AlertCircle size={12} />{errors.email}</span>
                  )}
                </div>

                <div className="field">
                  <label className="field-label">Password</label>
                  <div className="field-wrapper">
                    <span className="field-icon"><Lock size={16} /></span>
                    <input
                      className={`field-input${errors.password ? ' has-error' : ''}`}
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={onChange('password')}
                      placeholder="••••••••••"
                      autoComplete="current-password"
                    />
                    <button type="button" className="field-toggle" onClick={() => setShowPassword(p => !p)} tabIndex={-1} aria-label="Toggle password visibility">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="field-error"><AlertCircle size={12} />{errors.password}</span>
                  )}
                </div>
              </div>

              {loginError && !sessionConflict && (
                <div className="login-alert">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  {loginError}
                </div>
              )}

              {sessionConflict && (
                <div className="conflict-alert">
                  <div className="conflict-alert-row">
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    {loginError}
                  </div>
                  <div className="conflict-alert-hint">Signing in will end the existing session.</div>
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting && !sessionConflict ? 'Authenticating…' : 'Sign In'}
              </button>

              {sessionConflict && (
                <button
                  type="button"
                  className="btn-force"
                  disabled={submitting}
                  onClick={() => doLogin(true)}
                >
                  {submitting ? 'Signing in…' : 'Sign In Anyway & End Other Session'}
                </button>
              )}
            </form>

            <div className="form-footer">
              <Shield size={13} />
              256-bit encrypted · SOC 2 aligned · Access is audited
            </div>
          </div>
        </div>
      </div>

      {/* ── Password Change Required Modal ── */}
      {showPasswordChangeModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-header-icon">
                <Lock size={20} color="#fff" />
              </div>
              <div>
                <div className="modal-title">Password Change Required</div>
                <div className="modal-subtitle">Set a new secure password to continue</div>
              </div>
            </div>

            <div className="modal-body">
              <div className="field">
                <label className="field-label">New Password</label>
                <div className="field-wrapper">
                  <span className="field-icon"><Lock size={16} /></span>
                  <input
                    className="field-input"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setPasswordError('') }}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                  <button type="button" className="field-toggle" onClick={() => setShowNewPassword(p => !p)} tabIndex={-1}>
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {newPassword && (
                  <>
                    <div className="strength-bars">
                      {pwStrength.bars.map((filled, i) => (
                        <div key={i} className="strength-bar" style={{ background: filled ? pwStrength.color : undefined }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: pwStrength.color, fontWeight: 600 }}>{pwStrength.label}</span>
                  </>
                )}
              </div>

              <div className="field">
                <label className="field-label">Confirm New Password</label>
                <div className="field-wrapper">
                  <span className="field-icon"><Lock size={16} /></span>
                  <input
                    className="field-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setPasswordError('') }}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                  <button type="button" className="field-toggle" onClick={() => setShowConfirmPassword(p => !p)} tabIndex={-1}>
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {newPassword && (
                <div className="req-list">
                  {requirements.map(r => (
                    <div className="req-item" key={r.text}>
                      <CheckCircle size={13} color={r.met ? '#10b981' : '#1e3a5f'} />
                      <span className={r.met ? 'req-text-met' : 'req-text-unmet'}>{r.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {passwordError && (
                <div className="modal-error">
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  {passwordError}
                </div>
              )}

              <button
                className="btn-primary"
                onClick={handlePasswordChange}
                disabled={changingPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? 'Updating Password…' : 'Set New Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
