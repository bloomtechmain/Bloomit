import { useState, useEffect } from 'react'
import { User, Mail, Phone, Calendar, MapPin, Heart, Building, CreditCard, Shield, Edit, Save, X } from 'lucide-react'
import { getEmployeeProfile, updateEmployeeProfile } from '../services/employeePortalService'
import type { EmployeeProfileData } from '../services/employeePortalService'

interface EmployeeProfileProps {
  employeeId: number
  accessToken: string
}

export default function EmployeeProfile({ employeeId, accessToken }: EmployeeProfileProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<EmployeeProfileData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Editable fields
  const [editedPhone, setEditedPhone] = useState('')
  const [editedAddress, setEditedAddress] = useState('')
  const [editedEmergencyName, setEditedEmergencyName] = useState('')
  const [editedEmergencyRelationship, setEditedEmergencyRelationship] = useState('')
  const [editedEmergencyPhone, setEditedEmergencyPhone] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getEmployeeProfile(employeeId, accessToken)
        setProfile(data)
        // Initialize editable fields
        setEditedPhone(data.personalInfo.phone || '')
        setEditedAddress(data.personalInfo.address || '')
        setEditedEmergencyName(data.emergencyContact.name === 'Not provided' ? '' : data.emergencyContact.name)
        setEditedEmergencyRelationship(data.emergencyContact.relationship === 'Not provided' ? '' : data.emergencyContact.relationship)
        setEditedEmergencyPhone(data.emergencyContact.phone === 'Not provided' ? '' : data.emergencyContact.phone)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [employeeId, accessToken])

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset fields
      if (profile) {
        setEditedPhone(profile.personalInfo.phone || '')
        setEditedAddress(profile.personalInfo.address || '')
        setEditedEmergencyName(profile.emergencyContact.name === 'Not provided' ? '' : profile.emergencyContact.name)
        setEditedEmergencyRelationship(profile.emergencyContact.relationship === 'Not provided' ? '' : profile.emergencyContact.relationship)
        setEditedEmergencyPhone(profile.emergencyContact.phone === 'Not provided' ? '' : profile.emergencyContact.phone)
      }
    }
    setIsEditing(!isEditing)
    setError(null)
    setSuccessMessage(null)
  }

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const result = await updateEmployeeProfile(employeeId, accessToken, {
        phone: editedPhone,
        address: editedAddress,
        emergencyContact: {
          name: editedEmergencyName,
          relationship: editedEmergencyRelationship,
          phone: editedEmergencyPhone
        }
      })

      setProfile(result.profile)
      setIsEditing(false)
      setSuccessMessage('Profile updated successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div>Loading profile...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h3>Error Loading Profile</h3>
        <p style={{ color: '#ef4444' }}>{error || 'Profile data not available'}</p>
      </div>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 32 }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 28 }}>
            My Profile
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            View and update your personal information
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={handleEditToggle}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Edit size={18} />
            Edit Profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleEditToggle}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              disabled={saving}
            >
              <X size={18} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--success)' }}
              disabled={saving}
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div style={{ padding: 16, marginBottom: 24, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, color: 'var(--success)' }}>
          ✓ {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{ padding: 16, marginBottom: 24, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, color: 'var(--danger)' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: 24 }}>
        {/* Personal Information */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <User size={24} style={{ color: 'var(--primary)' }} />
            <h2 style={{ margin: 0, fontSize: 20 }}>Personal Information</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                Full Name
              </label>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {profile.personalInfo.fullName}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                Employee Number
              </label>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {profile.employeeNumber}
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                <Mail size={14} />
                Email Address
              </label>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {profile.personalInfo.email}
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                <Phone size={14} />
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editedPhone}
                  onChange={(e) => setEditedPhone(e.target.value)}
                  placeholder="Enter phone number"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'inherit',
                    fontSize: 16,
                    fontWeight: 500
                  }}
                />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  {profile.personalInfo.phone || 'Not provided'}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                <Calendar size={14} />
                Date of Birth
              </label>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {formatDate(profile.personalInfo.dateOfBirth)}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                NIC Number
              </label>
              <div style={{ fontSize: 16, fontWeight: 500, fontFamily: 'monospace' }}>
                {profile.personalInfo.nic}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                <MapPin size={14} />
                Address
              </label>
              {isEditing ? (
                <textarea
                  value={editedAddress}
                  onChange={(e) => setEditedAddress(e.target.value)}
                  placeholder="Enter address"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'inherit',
                    fontSize: 16,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  {profile.personalInfo.address || 'Not provided'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Building size={24} style={{ color: 'var(--primary)' }} />
            <h2 style={{ margin: 0, fontSize: 20 }}>Employment Details</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                Position / Title
              </label>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {profile.employmentDetails.position}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                Department
              </label>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {profile.employmentDetails.department}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                Role
              </label>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {profile.employmentDetails.role}
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                <Calendar size={14} />
                Hire Date
              </label>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {formatDate(profile.employmentDetails.hireDate)}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                Manager
              </label>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {profile.employmentDetails.manager}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                Employment Status
              </label>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                <span style={{ 
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: 12,
                  background: 'var(--success)',
                  color: '#fff',
                  fontSize: 14
                }}>
                  {profile.employmentDetails.status}
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                Annual PTO Allowance
              </label>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {profile.employmentDetails.ptoAllowance} days
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Heart size={24} style={{ color: 'var(--danger)' }} />
            <h2 style={{ margin: 0, fontSize: 20 }}>Emergency Contact</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                Contact Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedEmergencyName}
                  onChange={(e) => setEditedEmergencyName(e.target.value)}
                  placeholder="Enter emergency contact name"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'inherit',
                    fontSize: 16,
                    fontWeight: 500
                  }}
                />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  {profile.emergencyContact.name}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                Relationship
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedEmergencyRelationship}
                  onChange={(e) => setEditedEmergencyRelationship(e.target.value)}
                  placeholder="e.g., Spouse, Parent, Sibling"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'inherit',
                    fontSize: 16,
                    fontWeight: 500
                  }}
                />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  {profile.emergencyContact.relationship}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                <Phone size={14} />
                Emergency Phone
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editedEmergencyPhone}
                  onChange={(e) => setEditedEmergencyPhone(e.target.value)}
                  placeholder="Enter emergency phone number"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'inherit',
                    fontSize: 16,
                    fontWeight: 500
                  }}
                />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  {profile.emergencyContact.phone}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Banking Information */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <CreditCard size={24} style={{ color: 'var(--primary)' }} />
            <h2 style={{ margin: 0, fontSize: 20 }}>Banking Information</h2>
          </div>
          
          <div style={{ 
            padding: 16, 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
            color: '#ef4444'
          }}>
            <strong>Security Notice:</strong> Sensitive information is masked for your protection.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                Bank Name
              </label>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {profile.bankingInfo.bankName}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                Account Number
              </label>
              <div style={{ fontSize: 16, fontWeight: 500, fontFamily: 'monospace' }}>
                {profile.bankingInfo.accountNumber}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                Branch
              </label>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {profile.bankingInfo.branch}
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Shield size={24} style={{ color: 'var(--success)' }} />
            <h2 style={{ margin: 0, fontSize: 20 }}>Benefits & Contributions</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                EPF (Employee Provident Fund)
              </label>
              <div style={{ 
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: 20,
                background: profile.benefits.epfEnabled ? 'var(--success)' : '#6b7280',
                color: '#fff',
                fontSize: 14,
                fontWeight: 500
              }}>
                {profile.benefits.epfEnabled ? '✓ Enabled' : '✗ Not Enabled'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                ETF (Employee Trust Fund)
              </label>
              <div style={{ 
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: 20,
                background: profile.benefits.etfEnabled ? 'var(--success)' : '#6b7280',
                color: '#fff',
                fontSize: 14,
                fontWeight: 500
              }}>
                {profile.benefits.etfEnabled ? '✓ Enabled' : '✗ Not Enabled'}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
