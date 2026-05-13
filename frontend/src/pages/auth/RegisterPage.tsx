import { useState, FormEvent } from 'react'
import { useAuth }  from '@/contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

export default function RegisterPage() {
  const { register }    = useAuth()
  const navigate        = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'linear-gradient(135deg,#0a0f1e,#0d1f3c)'}}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">💰</div>
          <h1 className="text-2xl font-bold text-blue-400">Planner Financeiro Pro</h1>
          <p className="text-slate-400 text-sm mt-1">Crie sua conta gratuita</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl p-8 border border-white/10" style={{background:'#1a2235'}}>
          <h2 className="text-lg font-bold mb-6 text-center">Criar conta</h2>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Nome completo</label>
            <input
              type="text" required value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border border-slate-700 focus:border-blue-500 transition-colors"
              style={{background:'#0a0f1e',color:'#e2e8f0'}}
              placeholder="Artur Silva"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">E-mail</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border border-slate-700 focus:border-blue-500 transition-colors"
              style={{background:'#0a0f1e',color:'#e2e8f0'}}
              placeholder="seu@email.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Senha (mín. 6 caracteres)</label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border border-slate-700 focus:border-blue-500 transition-colors"
              style={{background:'#0a0f1e',color:'#e2e8f0'}}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white transition-all"
            style={{background:loading?'#15803d':'#16a34a'}}
          >
            {loading ? 'Criando conta...' : 'Criar conta →'}
          </button>

          <p className="text-center text-sm text-slate-400 mt-4">
            Já tem conta?{' '}
            <Link to="/login" className="text-blue-400 font-semibold hover:underline">
              Fazer login
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
