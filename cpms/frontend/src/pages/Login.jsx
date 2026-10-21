import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <img src="/logo.png" alt="Logo" className="auth-logo" />
        <h1 className="auth-title">Candidate Performance Management</h1>
        <p className="auth-subtitle">Track streams, scores and progress in one place</p>

        <form
          onSubmit={handleSubmit}
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
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />

          <Link
            to="/reset-password"
            style={{
              color: 'var(--color-navy, #172951)',
              fontSize: '0.85rem',
              textAlign: 'right',
            }}
          >
            Forgot password?
          </Link>

          {error && (
            <p className="alert alert-danger" style={{ margin: 0 }}>
              {error}
            </p>
          )}

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}