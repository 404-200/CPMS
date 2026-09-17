import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import { AuthProvider, useAuth } from './context/AuthContext'
import { StreamProvider } from './context/StreamContext'
import BiweeklyResults from './pages/BiweeklyResults'
import Candidates from './pages/Candidates'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import ManualEntry from './pages/ManualEntry'
import MonthlyResults from './pages/MonthlyResults'
import ResetPassword from './pages/ResetPassword'
import UploadScores from './pages/UploadScores'

function ProtectedLayout({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <p style={{ padding: '2rem' }}>Loading…</p>
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        }
      />
      <Route
        path="/candidates"
        element={
          <ProtectedLayout>
            <Candidates />
          </ProtectedLayout>
        }
      />
      <Route
        path="/entry/manual"
        element={
          <ProtectedLayout>
            <ManualEntry />
          </ProtectedLayout>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedLayout>
            <UploadScores />
          </ProtectedLayout>
        }
      />
      <Route
        path="/results/biweekly"
        element={
          <ProtectedLayout>
            <BiweeklyResults />
          </ProtectedLayout>
        }
      />
      <Route
        path="/results/monthly"
        element={
          <ProtectedLayout>
            <MonthlyResults />
          </ProtectedLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <StreamProvider>
        <AppRoutes />
      </StreamProvider>
    </AuthProvider>
  )
}

export default App
