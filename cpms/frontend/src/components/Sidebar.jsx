import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/candidates', label: 'Candidates' },
  { to: '/upload', label: 'Upload Scores' },
  { to: '/results/biweekly', label: 'Biweekly Results' },
  { to: '/results/monthly', label: 'Monthly Results' },
]

export default function Sidebar() {
  return (
    <nav style={styles.nav}>
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          style={({ isActive }) => ({
            ...styles.link,
            ...(isActive ? styles.activeLink : {}),
          })}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}

const styles = {
  nav: {
    width: 200,
    flexShrink: 0,
    background: 'var(--color-navy)',
    padding: '1rem 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  link: {
    padding: '0.6rem 1.25rem',
    textDecoration: 'none',
    color: '#ffffff',
    opacity: 0.85,
    fontSize: '0.9rem',
    borderLeft: '3px solid transparent',
  },
  activeLink: {
    background: 'var(--color-navy-light)',
    opacity: 1,
    fontWeight: 600,
    borderLeft: '3px solid var(--color-coral)',
  },
}