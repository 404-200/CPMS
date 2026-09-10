import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const MAIN_LINKS = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/candidates', label: 'Candidates', icon: '🧑‍🎓' },
]

const ENTRY_LINKS = [
  { to: '/entry/manual', label: 'Manual Score Entry', icon: '✍️' },
  { to: '/upload', label: 'Upload Score Sheet', icon: '📄' },
]

const RESULT_LINKS = [
  { to: '/results/biweekly', label: 'Biweekly Results', icon: '📈' },
  { to: '/results/monthly', label: 'Monthly Results', icon: '🗓️' },
]

function Group({ label, links }) {
  return (
    <>
      <div className="sidebar-section-label">{label}</div>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span aria-hidden>{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
    </>
  )
}

export default function Sidebar() {
  const { user } = useAuth()
  const canManage = user && ['ADMIN', 'MANAGER'].includes(user.role)

  return (
    <nav className="sidebar">
      <Group label="Overview" links={MAIN_LINKS} />
      {canManage && <Group label="Score Entry" links={ENTRY_LINKS} />}
      <Group label="Results" links={RESULT_LINKS} />
    </nav>
  )
}
