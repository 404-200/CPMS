import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import { AuthProvider, useAuth } from './context/AuthContext'
import BiweeklyResults from './pages/BiweeklyResults'
import Candidates from './pages/Candidates'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import MonthlyResults from './pages/MonthlyResults'
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '1.5rem 2rem', background: '#ffffff' }}>{children}</main>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
