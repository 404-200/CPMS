import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { forgotPassword } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('VIEWER')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [forgotSubmitted, setForgotSubmitted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        navigate('/')
      } else if (mode === 'register') {
        await register(fullName, email, password, role)
        navigate('/')
      } else if (mode === 'forgot') {
        await forgotPassword(email)
        setForgotSubmitted(true)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setForgotSubmitted(false)
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <img src="/logo.png" alt="Logo" className="auth-logo" />
        <h1 className="auth-title">Candidate Performance Management</h1>
        <p className="auth-subtitle">Track streams, scores and progress in one place</p>

        {mode !== 'forgot' && (
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              Register
            </button>
          </div>
        )}

        {mode === 'forgot' ? (
          forgotSubmitted ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p className="alert alert-success" style={{ margin: 0 }}>
                If an account with that email exists, a password reset link has been sent. Check your inbox.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => switchMode('login')}>
                Back to sign in
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="form-panel"
              style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <p className="auth-subtitle" style={{ margin: 0 }}>
                Enter your email and we'll send you a link to reset your password.
              </p>
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
              <button
                type="button"
                className="auth-tab"
                style={{ textAlign: 'center' }}
                onClick={() => switchMode('login')}
              >
                Back to sign in
              </button>
            </form>
          )
        ) : (
          <form
            onSubmit={handleSubmit}
            className="form-panel"
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            {mode === 'register' && (
              <input
                className="input"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {mode === 'register' && (
              <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="VIEWER">Viewer</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            )}

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-navy, #172951)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textAlign: 'right',
                  padding: 0,
                }}
              >
                Forgot password?
              </button>
            )}

            {error && (
              <p className="alert alert-danger" style={{ margin: 0 }}>
                {error}
              </p>
            )}

            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}