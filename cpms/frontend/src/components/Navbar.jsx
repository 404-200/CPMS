import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <img src="/logo.png" alt="Logo" style={styles.logo} />
        <span style={styles.title}>Candidate Performance Management</span>
      </div>
      {user && (
        <div style={styles.right}>
          <span style={styles.user}>
            {user.full_name} · {user.role}
          </span>
          <button style={styles.button} onClick={logout}>
            Log out
          </button>
        </div>
      )}
    </header>
  )
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.6rem 1.5rem',
    background: 'var(--color-navy)',
    color: '#fff',
  },
  left: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  logo: { height: 32, width: 'auto', borderRadius: 4 },
  title: { fontWeight: 600, color: '#fff' },
  right: { display: 'flex', alignItems: 'center', gap: '1rem' },
  user: { fontSize: '0.85rem', color: '#fff', opacity: 0.9 },
  button: {
    background: 'var(--color-navy-light)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 6,
    padding: '0.4rem 0.8rem',
    cursor: 'pointer',
  },
}