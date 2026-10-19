import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  BarChartIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DashboardIcon,
  EditIcon,
  UploadIcon,
  UsersIcon,
} from './icons'

const STORAGE_KEY = 'cpms_sidebar_collapsed'

const MAIN_LINKS = [
  { to: '/', label: 'Dashboard', Icon: DashboardIcon },
  { to: '/candidates', label: 'Candidates', Icon: UsersIcon },
]

const ENTRY_LINKS = [
  { to: '/entry/manual', label: 'Manual score entry', Icon: EditIcon },
  { to: '/upload', label: 'Upload score sheet', Icon: UploadIcon },
]

const RESULT_LINKS = [
  { to: '/results/biweekly', label: 'Biweekly results', Icon: BarChartIcon },
  { to: '/results/monthly', label: 'Monthly results', Icon: CalendarIcon },
]

function Group({ label, links, collapsed }) {
  return (
    <div className="sidebar-group">
      <div className="sidebar-section-label">{label}</div>
      {links.map(({ to, label: text, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          data-label={text}
          // When only icons show, screen readers still need the name.
          aria-label={collapsed ? text : undefined}
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
        >
          <Icon className="sidebar-icon" />
          <span className="sidebar-label">{text}</span>
        </NavLink>
      ))}
    </div>
  )
}

export default function Sidebar() {
  const { user } = useAuth()
  const canManage = user && ['ADMIN', 'MANAGER'].includes(user.role)

  // Remembered between visits, so the sidebar stays how the user left it.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      // Storage unavailable (private mode): the toggle still works for this visit.
    }
  }

  return (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}`} aria-label="Main navigation">
      <Group label="Overview" links={MAIN_LINKS} collapsed={collapsed} />
      {canManage && <Group label="Score entry" links={ENTRY_LINKS} collapsed={collapsed} />}
      <Group label="Results" links={RESULT_LINKS} collapsed={collapsed} />

      <button
        type="button"
        className="sidebar-toggle"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        data-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRightIcon className="sidebar-icon" /> : <ChevronLeftIcon className="sidebar-icon" />}
        <span className="sidebar-label">Collapse</span>
      </button>
    </nav>
  )
}