import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(fullName, email, password, 'VIEWER')
      }
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <img src="/logo.png" alt="Logo" style={styles.logo} />
        <h1 style={styles.title}>Candidate Performance Management</h1>
        <p style={styles.subtitle}>{mode === 'login' ? 'Sign in' : 'Create an account'}</p>

        <form onSubmit={handleSubmit} style={styles.detailsPanel}>
          {mode === 'register' && (
            <input
              style={styles.input}
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}
          </button>
        </form>

        <button
          type="button"
          style={styles.switchButton}
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? "Need an account? Register" : 'Already have an account? Sign in'}
        </button>
        
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
  },
  card: {
    background: '#ffffff',
    padding: '2rem',
    borderRadius: 10,
    boxShadow: '0 1px 8px rgba(23, 41, 81, 0.12)',
    width: 360,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  logo: { height: 56, width: 'auto', marginBottom: '0.25rem', borderRadius: 8 },
  title: { fontSize: '1.05rem', margin: 0, textAlign: 'center', color: 'var(--color-navy)' },
  subtitle: { margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.9rem' },
  detailsPanel: {
    width: '100%',
    background: 'var(--color-pink-light)',
    borderRadius: 10,
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  input: {
    padding: '0.6rem',
    border: '1px solid #e6c9cc',
    borderRadius: 6,
    background: '#ffffff',
    color: 'var(--color-navy)',
  },
  button: {
    background: 'var(--color-navy)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '0.65rem',
    cursor: 'pointer',
    marginTop: '0.25rem',
    fontWeight: 600,
  },
  switchButton: {
    background: 'none',
    border: 'none',
    color: 'var(--color-navy)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    marginTop: '0.5rem',
  },
  error: { color: '#dc2626', fontSize: '0.85rem', margin: 0 },
  note: { fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem', textAlign: 'center' },
}