import { useAuth } from '../context/AuthContext'
import StreamSwitcher from './StreamSwitcher'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-left">
        <img src="/logo.png" alt="Logo" className="topbar-logo" />
        <span className="topbar-title">Candidate Performance Management</span>
      </div>
      {user && (
        <div className="topbar-right">
          <StreamSwitcher />
          <div className="topbar-user">
            <strong>{user.full_name}</strong>
            {user.role}
          </div>
          <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }} onClick={logout}>
            Log out
          </button>
        </div>
      )}
    </header>
  )
}
