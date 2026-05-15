import { useState, FormEvent } from 'react'
import { useAuth }             from '@/contexts/AuthContext'
import { useNavigate, Link }   from 'react-router-dom'
import { Logo }                from '@/components/Logo'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate     = useNavigate()

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

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
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md">
        {/* Header com Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-gray-500 text-sm mt-2">
            Crie sua conta gratuita
          </p>
        </div>

        {/* Card do formulário */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            Criar conta
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome completo
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border border-gray-300 bg-gray-50 text-gray-800 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border border-gray-300 bg-gray-50 text-gray-800 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border border-gray-300 bg-gray-50 text-gray-800 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white bg-primary-500 hover:bg-primary-600 active:bg-primary-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary-500 font-semibold hover:text-primary-600 hover:underline">
              Fazer login
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
