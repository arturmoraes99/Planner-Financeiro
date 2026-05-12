import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '@/api/client'

interface User {
  id:    string
  name:  string
  email: string
}

interface AuthContextType {
  user:     User | null
  token:    string | null
  login:    (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout:   () => void
  loading:  boolean
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [token,   setToken]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser  = localStorage.getItem('user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user',  JSON.stringify(data.user))
  }

  const register = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password })
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user',  JSON.stringify(data.user))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

const updateUser = (updatedData: Partial<User>) => {
  setUser((prev) => prev ? { ...prev, ...updatedData } : prev);

  // Atualiza o localStorage se estiver usando
  const stored = localStorage.getItem("@planner:user");
  if (stored) {
    const parsed = JSON.parse(stored);
    localStorage.setItem(
      "@planner:user",
      JSON.stringify({ ...parsed, ...updatedData })
    );
  }
};


  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
