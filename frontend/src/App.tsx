import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth }      from '@/contexts/AuthContext'
import LoginPage        from '@/pages/auth/LoginPage'
import RegisterPage     from '@/pages/auth/RegisterPage'
import DashboardPage    from '@/pages/DashboardPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Carregando...</span>
        </div>
      </div>
    )
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/*" element={
        <PrivateRoute>
          <DashboardPage />
        </PrivateRoute>
      } />
    </Routes>
  )
}