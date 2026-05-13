import {
  createContext, useContext, useState,
  useEffect, useCallback, ReactNode,
} from 'react'
import { api } from '@/api/client'
import type { User } from '@/types'

interface AuthContextType {
  user:       User | null
  token:      string | null
  loading:    boolean
  login:      (email: string, password: string) => Promise<void>
  register:   (name: string, email: string, password: string) => Promise<void>
  logout:     () => void
  updateUser: (data: Partial<User>) => void
}

// Chaves do localStorage centralizadas — evita typos
const STORAGE_KEYS = {
  token: '@planner:token',
  user:  '@planner:user',
} as const

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [token,   setToken]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Hidrata o estado a partir do localStorage na primeira carga
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(STORAGE_KEYS.token)
      const savedUser  = localStorage.getItem(STORAGE_KEYS.user)
      if (savedToken && savedUser) {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      }
    } catch {
      // JSON inválido — limpa o storage corrompido
      localStorage.removeItem(STORAGE_KEYS.token)
      localStorage.removeItem(STORAGE_KEYS.user)
    } finally {
      setLoading(false)
    }
  }, [])

  /** Persiste token + user no state e localStorage */
  const persist = useCallback((t: string, u: User) => {
    setToken(t)
    setUser(u)
    localStorage.setItem(STORAGE_KEYS.token, t)
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(u))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    persist(data.token, data.user)
  }, [persist])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password })
    persist(data.token, data.user)
  }, [persist])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(STORAGE_KEYS.token)
    localStorage.removeItem(STORAGE_KEYS.user)
    window.location.href = '/login'
  }, [])

  // ✅ BUG CORRIGIDO: usava chave diferente ('token' vs '@planner:token')
  const updateUser = useCallback((updatedData: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...updatedData }
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
