import { useState, useEffect } from 'react'
import { Settings, Mail, Save, X } from 'lucide-react'
import { useToast } from '../context/ToastContext'

interface EmailPreferences {
  pto_notifications: boolean
  time_entry_reminders: boolean
  announcement_notifications: boolean
}

interface EmployeeSettingsProps {
  employeeId: number
  accessToken: string
}

export default function EmployeeSettings({ employeeId, accessToken }: EmployeeSettingsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailPreferences, setEmailPreferences] = useState<EmailPreferences>({
    pto_notifications: true,
    time_entry_reminders: true,
    announcement_notifications: true
  })
  const [originalPreferences, setOriginalPreferences] = useState<EmailPreferences>({
    pto_notifications: true,
    time_entry_reminders: true,
    announcement_notifications: true
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch email preferences
  const fetchPreferences = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/employee-portal/settings/${employeeId}/email-preferences`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch email preferences')
      }

      const data = await response.json()
      const prefs = data.emailPreferences || {
        pto_notifications: true,
        time_entry_reminders: true,
        announcement_notifications: true
      }
      
      setEmailPreferences(prefs)
      setOriginalPreferences(prefs)
    } catch (err) {
      console.error('Error fetching preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPreferences()
  }, [employeeId])

  // Check for changes
  useEffect(() => {
    const changed = 
      emailPreferences.pto_notifications !== originalPreferences.pto_notifications ||
      emailPreferences.time_entry_reminders !== originalPreferences.time_entry_reminders ||
      emailPreferences.announcement_notifications !== originalPreferences.announcement_notifications
    
    setHasChanges(changed)
  }, [emailPreferences, originalPreferences])

  // Save preferences
  const savePreferences = async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/employee-portal/settings/${employeeId}/email-preferences`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailPreferences)
        }
      )

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      await response.json()
      setOriginalPreferences(emailPreferences)
      toast.success('Settings saved successfully!')
    } catch (err) {
      console.error('Error saving preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Cancel changes
  const cancelChanges = () => {
    setEmailPreferences(originalPreferences)
    setError(null)
  }

  // Toggle preference
  const togglePreference = (key: keyof EmailPreferences) => {
    setEmailPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <p>Loading settings...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? 12 : 24, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12, 
          marginTop: 0,
          fontSize: isMobile ? 24 : 32 
        }}>
          <Settings size={isMobile ? 28 : 36} />
          Settings
        </h1>
        <p style={{ color: '#6b7280', margin: '8px 0 0' }}>
          Manage your account preferences and notifications
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: 16, 
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderLeft: '4px solid #ef4444'
          }}
        >
          <AlertCircle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span style={{ color: '#ef4444', fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {/* Email Notifications Section */}
      <div className="glass-panel" style={{ padding: isMobile ? 16 : 24, marginBottom: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            margin: '0 0 8px',
            fontSize: 20,
            fontWeight: 600
          }}>
            <Mail size={24} />
            Email Notifications
          </h2>
          <p style={{ color: '#6b7280', margin: 0, fontSize: 14 }}>
            Choose which email notifications you'd like to receive
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* PTO Notifications */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'space-between',
            paddingBottom: 16,
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 500 }}>
                PTO Request Notifications
              </h4>
              <p style={{ margin: 0, fontSize: 14, color: '#9ca3af' }}>
                Get notified when your PTO requests are approved or denied
              </p>
            </div>
            <label style={{ 
              position: 'relative', 
              display: 'inline-block', 
              width: 52, 
              height: 28,
              flexShrink: 0,
              marginLeft: 16
            }}>
              <input
                type="checkbox"
                checked={emailPreferences.pto_notifications}
                onChange={() => togglePreference('pto_notifications')}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: emailPreferences.pto_notifications ? '#3b82f6' : '#4b5563',
                transition: '0.3s',
                borderRadius: 28
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: 20,
                  width: 20,
                  left: emailPreferences.pto_notifications ? 28 : 4,
                  bottom: 4,
                  backgroundColor: 'white',
                  transition: '0.3s',
                  borderRadius: '50%'
                }} />
              </span>
            </label>
          </div>

          {/* Time Entry Reminders */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'space-between',
            paddingBottom: 16,
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 500 }}>
                Time Entry Reminders
              </h4>
              <p style={{ margin: 0, fontSize: 14, color: '#9ca3af' }}>
                Receive reminders to submit your time entries
              </p>
            </div>
            <label style={{ 
              position: 'relative', 
              display: 'inline-block', 
              width: 52, 
              height: 28,
              flexShrink: 0,
              marginLeft: 16
            }}>
              <input
                type="checkbox"
                checked={emailPreferences.time_entry_reminders}
                onChange={() => togglePreference('time_entry_reminders')}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: emailPreferences.time_entry_reminders ? '#3b82f6' : '#4b5563',
                transition: '0.3s',
                borderRadius: 28
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: 20,
                  width: 20,
                  left: emailPreferences.time_entry_reminders ? 28 : 4,
                  bottom: 4,
                  backgroundColor: 'white',
                  transition: '0.3s',
                  borderRadius: '50%'
                }} />
              </span>
            </label>
          </div>

          {/* Announcement Notifications */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'space-between',
            paddingBottom: 16,
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 500 }}>
                Company Announcements
              </h4>
              <p style={{ margin: 0, fontSize: 14, color: '#9ca3af' }}>
                Stay informed about company news and announcements
              </p>
            </div>
            <label style={{ 
              position: 'relative', 
              display: 'inline-block', 
              width: 52, 
              height: 28,
              flexShrink: 0,
              marginLeft: 16
            }}>
              <input
                type="checkbox"
                checked={emailPreferences.announcement_notifications}
                onChange={() => togglePreference('announcement_notifications')}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: emailPreferences.announcement_notifications ? '#3b82f6' : '#4b5563',
                transition: '0.3s',
                borderRadius: 28
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: 20,
                  width: 20,
                  left: emailPreferences.announcement_notifications ? 28 : 4,
                  bottom: 4,
                  backgroundColor: 'white',
                  transition: '0.3s',
                  borderRadius: '50%'
                }} />
              </span>
            </label>
          </div>

          {/* Payslip Notifications - Always On */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'space-between',
            opacity: 0.6
          }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 500 }}>
                Payslip Notifications
              </h4>
              <p style={{ margin: 0, fontSize: 14, color: '#9ca3af' }}>
                Critical emails that cannot be disabled
              </p>
            </div>
            <label style={{ 
              position: 'relative', 
              display: 'inline-block', 
              width: 52, 
              height: 28,
              flexShrink: 0,
              marginLeft: 16
            }}>
              <input
                type="checkbox"
                checked={true}
                disabled
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'not-allowed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#10b981',
                transition: '0.3s',
                borderRadius: 28
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: 20,
                  width: 20,
                  left: 28,
                  bottom: 4,
                  backgroundColor: 'white',
                  transition: '0.3s',
                  borderRadius: '50%'
                }} />
              </span>
            </label>
          </div>
        </div>

        {/* Important Note */}
        <div style={{
          marginTop: 20,
          padding: 12,
          borderRadius: 8,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <p style={{ margin: 0, fontSize: 13, color: '#93c5fd' }}>
            <strong>Note:</strong> Payslip notifications are critical and will always be sent to ensure you receive important financial information.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {hasChanges && (
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          justifyContent: isMobile ? 'stretch' : 'flex-end',
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          <button
            onClick={cancelChanges}
            disabled={saving}
            className="btn-secondary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 8,
              minWidth: isMobile ? '100%' : 120
            }}
          >
            <X size={16} />
            Cancel
          </button>
          <button
            onClick={savePreferences}
            disabled={saving}
            className="btn-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 8,
              minWidth: isMobile ? '100%' : 140
            }}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}
