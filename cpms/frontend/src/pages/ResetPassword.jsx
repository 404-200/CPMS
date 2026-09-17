import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/auth'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('This reset link is missing its token — please use the link from your email.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword(token, newPassword)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.response?.data?.detail || 'This link is invalid or has expired.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <img src="/logo.png" alt="Logo" className="auth-logo" />
        <h1 className="auth-title">Set a new password</h1>
        <p className="auth-subtitle">Choose a new password for your account</p>

        {success ? (
          <p className="alert alert-success" style={{ width: '100%' }}>
            Password reset successfully. Redirecting you to sign in…
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="form-panel"
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <input
              className="input"
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
            <input
              className="input"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />

            {error && (
              <p className="alert alert-danger" style={{ margin: 0 }}>
                {error}
              </p>
            )}

            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}