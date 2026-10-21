import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { forgotPassword, resetPassword } from '../api/auth'

// Single page for both steps of the flow:
// - no ?token in the URL  -> "forgot password" step, requests a reset link
// - ?token=... in the URL -> "set new password" step, consumes that link
export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  // Step 1: request link
  const [email, setEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)

  // Step 2: set new password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [success, setSuccess] = useState(false)

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleRequestLink(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await forgotPassword(email)
      setLinkSent(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSetPassword(e) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
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

  if (token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <img src="/logo.png" alt="Logo" className="auth-logo" />
          <h1 className="auth-title">Set your password</h1>
          <p className="auth-subtitle">Choose a password for your account</p>

          {success ? (
            <p className="alert alert-success" style={{ width: '100%' }}>
              Password set. Redirecting you to sign in…
            </p>
          ) : (
            <form
              onSubmit={handleSetPassword}
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

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <img src="/logo.png" alt="Logo" className="auth-logo" />
        <h1 className="auth-title">Forgot password</h1>
        <p className="auth-subtitle">Enter your email and we'll send you a reset link</p>

        {linkSent ? (
          <p className="alert alert-success" style={{ width: '100%' }}>
            If that email is registered, a password reset link has been sent.
          </p>
        ) : (
          <form
            onSubmit={handleRequestLink}
            className="form-panel"
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && (
              <p className="alert alert-danger" style={{ margin: 0 }}>
                {error}
              </p>
            )}

            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <Link to="/login" style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '0.75rem' }}>
          Back to sign in
        </Link>
      </div>
    </div>
  )
}