import { useEffect, useState } from 'react'
import { api }      from '@/api/client'
import { useAuth }  from '@/contexts/AuthContext'
import { Card, Button, Input, Select } from '@/components/ui'
import { ToastType } from '@/hooks/useToast'
import { Profile, Preferences } from '@/types'

interface Props {
  showToast: (msg: string, type?: ToastType) => void
}

type Tab = 'profile' | 'preferences' | 'notifications' | 'security' | 'account'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'profile',       label: 'Perfil',         icon: '👤' },
  { id: 'preferences',   label: 'Preferências',   icon: '🎨' },
  { id: 'notifications', label: 'Notificações',   icon: '🔔' },
  { id: 'security',      label: 'Segurança',      icon: '🔒' },
  { id: 'account',       label: 'Conta',          icon: '⚙️' },
]

function PasswordStrengthBar({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  const labels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte']
  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#00C39A']

  if (!password) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1.5 mb-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300"
            style={{ background: i <= score ? colors[score] : '#1E293B' }} />
        ))}
      </div>
      <span className="text-[11px] font-semibold" style={{ color: colors[score] }}>
        {labels[score]}
      </span>
    </div>
  )
}

export function SettingsPage({ showToast }: Props) {
  const { logout } = useAuth()
  const [tab, setTab] = useState<Tab>('profile')
  const [loading, setLoading] = useState(true)

  // Profile
  const [profile,      setProfile]      = useState<Profile | null>(null)
  const [profileName,  setProfileName]  = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Preferences
  const [prefs,       setPrefs]       = useState<Preferences>({ currency: 'BRL', theme: 'dark', language: 'pt-BR', notificationsEnabled: true })
  const [savingPrefs, setSavingPrefs] = useState(false)

  // Security
  const [currentPwd,  setCurrentPwd]  = useState('')
  const [newPwd,       setNewPwd]      = useState('')
  const [confirmPwd,   setConfirmPwd]  = useState('')
  const [showPwd,      setShowPwd]     = useState({ current: false, new: false, confirm: false })
  const [savingPwd,    setSavingPwd]   = useState(false)

  // Account
  const [deletePass,      setDeletePass]      = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [exportingData,   setExportingData]   = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, prRes] = await Promise.all([
          api.get<Profile>('/settings/profile'),
          api.get<Preferences>('/settings/preferences'),
        ])
        setProfile(pRes.data)
        setProfileName(pRes.data.name)
        setProfileEmail(pRes.data.email)
        setPrefs(prRes.data)
      } catch {
        showToast('Erro ao carregar configurações.', 'err')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, []) // eslint-disable-line

  // ── Handlers ────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!profileName.trim())  return showToast('Informe seu nome.', 'err')
    if (!profileEmail.trim()) return showToast('Informe seu e-mail.', 'err')
    setSavingProfile(true)
    try {
      const { data } = await api.put<Profile>('/settings/profile', { name: profileName, email: profileEmail })
      setProfile(data)
      showToast('✅ Perfil atualizado!', 'ok')
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Erro ao atualizar perfil.', 'err')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePrefs = async () => {
    setSavingPrefs(true)
    try {
      await api.put('/settings/preferences', prefs)
      showToast('✅ Preferências salvas!', 'ok')
    } catch {
      showToast('Erro ao salvar preferências.', 'err')
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPwd)            return showToast('Informe a senha atual.', 'err')
    if (newPwd.length < 6)      return showToast('A nova senha deve ter ao menos 6 caracteres.', 'err')
    if (newPwd !== confirmPwd)  return showToast('As senhas não coincidem.', 'err')
    setSavingPwd(true)
    try {
      await api.put('/settings/password', { currentPassword: currentPwd, newPassword: newPwd })
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      showToast('✅ Senha alterada com sucesso!', 'ok')
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Erro ao alterar senha.', 'err')
    } finally {
      setSavingPwd(false)
    }
  }

  const handleExportData = async () => {
    setExportingData(true)
    try {
      const { data } = await api.get('/settings/export')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `planner-dados-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('📦 Dados exportados com sucesso!', 'ok')
    } catch {
      showToast('Erro ao exportar dados.', 'err')
    } finally {
      setExportingData(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePass) return showToast('Informe sua senha.', 'err')
    setDeletingAccount(true)
    try {
      await api.delete('/settings/account', { data: { password: deletePass } })
      showToast('Conta excluída.', 'info')
      logout()
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Erro ao excluir conta.', 'err')
    } finally {
      setDeletingAccount(false)
    }
  }

  // ── Initials ────────────────────────────────────────────────────────
  const initials = profileName
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()

  // ── Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="flex items-center justify-center py-20 bg-[#0F172A]/80 border border-white/5 rounded-2xl">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-[#00C39A] rounded-full animate-spin" />
          <span className="text-sm">Carregando configurações...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-5">

      {/* ── Sidebar ── */}
      <aside className="md:w-56 shrink-0">
        <Card className="p-2 bg-[#0F172A]/80 border border-white/5 rounded-2xl">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left',
                tab === t.id
                  ? 'bg-gradient-to-r from-[#00C39A] to-[#00A383] text-white shadow-lg shadow-[#00C39A]/20'
                  : t.id === 'account'
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white',
              ].join(' ')}
            >
              <span className="text-base">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </Card>
      </aside>

      {/* ── Content ── */}
      <div className="flex-1 min-w-0">

        {/* PERFIL */}
        {tab === 'profile' && (
          <Card className="bg-[#0F172A]/80 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-[#00C39A] mb-6 flex items-center gap-2">
              <span>👤</span> Informações do Perfil
            </h2>

            {/* Avatar */}
            <div className="flex items-center gap-4 mb-8 p-4 rounded-2xl bg-[#0B1120] border border-white/5">
              <div className="w-16 h-16 rounded-full bg-[#00C39A]/20 border-2 border-[#00C39A] flex items-center justify-center text-2xl font-black text-[#00C39A] flex-shrink-0">
                {profile?.avatarUrl
                  ? <img src={profile.avatarUrl} alt="avatar" className="w-full h-full rounded-full object-cover" />
                  : initials
                }
              </div>
              <div>
                <p className="font-bold text-white">{profile?.name}</p>
                <p className="text-sm text-slate-400">{profile?.email}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Membro desde {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                    : '—'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <Input
                label="Nome completo"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                placeholder="Seu nome"
                maxLength={100}
              />
              <Input
                label="E-mail"
                type="email"
                value={profileEmail}
                onChange={e => setProfileEmail(e.target.value)}
                placeholder="seu@email.com"
              />
              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleSaveProfile} 
                  loading={savingProfile}
                  className="bg-gradient-to-r from-[#00C39A] to-[#00A383] hover:from-[#00D4A8] hover:to-[#00C39A] text-white font-semibold"
                >
                  💾 Salvar Perfil
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* PREFERÊNCIAS */}
        {tab === 'preferences' && (
          <Card className="bg-[#0F172A]/80 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-[#00C39A] mb-6 flex items-center gap-2">
              <span>🎨</span> Preferências
            </h2>
            <div className="flex flex-col gap-5">

              <Select
                label="Moeda padrão"
                value={prefs.currency}
                onChange={e => setPrefs(p => ({ ...p, currency: e.target.value }))}
              >
                <option value="BRL">🇧🇷 Real Brasileiro (R$)</option>
                <option value="USD">🇺🇸 Dólar Americano ($)</option>
                <option value="EUR">🇪🇺 Euro (€)</option>
              </Select>

              <div>
                <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">
                  Tema
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'dark',   label: '🌙 Escuro'  },
                    { value: 'light',  label: '☀️ Claro'   },
                    { value: 'system', label: '💻 Sistema' },
                  ].map(t => (
                    <button
                      key={t.value}
                      onClick={() => setPrefs(p => ({ ...p, theme: t.value }))}
                      className={[
                        'py-3 rounded-xl text-sm font-semibold border-2 transition-all',
                        prefs.theme === t.value
                          ? 'border-[#00C39A] bg-[#00C39A]/15 text-[#00C39A]'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white',
                      ].join(' ')}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <Select
                label="Idioma"
                value={prefs.language}
                onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
              >
                <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                <option value="en-US">🇺🇸 English (US)</option>
              </Select>

              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleSavePrefs} 
                  loading={savingPrefs}
                  className="bg-gradient-to-r from-[#00C39A] to-[#00A383] hover:from-[#00D4A8] hover:to-[#00C39A] text-white font-semibold"
                >
                  💾 Salvar Preferências
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* NOTIFICAÇÕES */}
        {tab === 'notifications' && (
          <Card className="bg-[#0F172A]/80 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-[#00C39A] mb-6 flex items-center gap-2">
              <span>🔔</span> Notificações
            </h2>
            <div className="flex flex-col gap-3">
              {[
                {
                  key: 'notificationsEnabled' as const,
                  label: 'Notificações gerais',
                  desc: 'Receba alertas sobre atividades na sua conta',
                },
              ].map(item => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-4 bg-[#0B1120] rounded-xl border border-white/5"
                >
                  <div>
                    <p className="font-semibold text-sm text-white">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                    className={[
                      'relative w-12 h-6 rounded-full transition-colors',
                      prefs[item.key] ? 'bg-[#00C39A]' : 'bg-slate-700',
                    ].join(' ')}
                  >
                    <span className={[
                      'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                      prefs[item.key] ? 'translate-x-7' : 'translate-x-1',
                    ].join(' ')} />
                  </button>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleSavePrefs} 
                  loading={savingPrefs}
                  className="bg-gradient-to-r from-[#00C39A] to-[#00A383] hover:from-[#00D4A8] hover:to-[#00C39A] text-white font-semibold"
                >
                  💾 Salvar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* SEGURANÇA */}
        {tab === 'security' && (
          <Card className="bg-[#0F172A]/80 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-[#00C39A] mb-6 flex items-center gap-2">
              <span>🔒</span> Alterar Senha
            </h2>
            <div className="flex flex-col gap-4">
              {/* Current password */}
              <div>
                <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5">
                  Senha atual
                </label>
                <div className="relative">
                  <input
                    type={showPwd.current ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={e => setCurrentPwd(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none border border-slate-700 focus:border-[#00C39A] transition-colors bg-[#0B1120] text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => ({ ...s, current: !s.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPwd.current ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    type={showPwd.new ? 'text' : 'password'}
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none border border-slate-700 focus:border-[#00C39A] transition-colors bg-[#0B1120] text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => ({ ...s, new: !s.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPwd.new ? '🙈' : '👁️'}
                  </button>
                </div>
                <PasswordStrengthBar password={newPwd} />
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <input
                    type={showPwd.confirm ? 'text' : 'password'}
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none border border-slate-700 focus:border-[#00C39A] transition-colors bg-[#0B1120] text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => ({ ...s, confirm: !s.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPwd.confirm ? '🙈' : '👁️'}
                  </button>
                </div>
                {confirmPwd && newPwd !== confirmPwd && (
                  <p className="text-xs text-red-400 mt-1">As senhas não coincidem.</p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleChangePassword} 
                  loading={savingPwd}
                  className="bg-gradient-to-r from-[#00C39A] to-[#00A383] hover:from-[#00D4A8] hover:to-[#00C39A] text-white font-semibold"
                >
                  🔒 Alterar Senha
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* CONTA */}
        {tab === 'account' && (
          <div className="flex flex-col gap-4">

            {/* Export data */}
            <Card className="bg-[#0F172A]/80 border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#00C39A] mb-1 flex items-center gap-2">
                    <span>📦</span> Exportar meus dados
                  </h3>
                  <p className="text-sm text-slate-400">
                    Baixe todas as suas transações, metas e orçamentos em formato JSON.
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={handleExportData} 
                  loading={exportingData}
                  className="border border-[#00C39A]/30 text-[#00C39A] hover:bg-[#00C39A]/10"
                >
                  ⬇ Exportar
                </Button>
              </div>
            </Card>

            {/* Danger zone */}
            <Card className="bg-[#0F172A]/80 border border-red-900/40 rounded-2xl p-6">
              <h3 className="font-bold text-red-400 mb-1 flex items-center gap-2">
                <span>🗑</span> Excluir minha conta
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Esta ação é <strong className="text-white">irreversível</strong>. Todos os seus
                dados serão permanentemente excluídos.
              </p>
              <Button
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                Excluir conta
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}
        >
          <div className="rounded-2xl p-6 border border-red-900/60 w-full max-w-sm bg-[#0F172A]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center text-xl">🗑</div>
              <h3 className="font-bold text-red-400">Confirmar exclusão</h3>
            </div>
            <p className="text-sm text-slate-400 mb-5">
              Digite sua senha para confirmar. Esta ação excluirá permanentemente todos os seus dados.
            </p>
            <div className="relative mb-4">
              <input
                type="password"
                value={deletePass}
                onChange={e => setDeletePass(e.target.value)}
                placeholder="Sua senha"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border border-red-900/50 focus:border-red-500 transition-colors bg-[#0B1120] text-slate-200"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 justify-center border-slate-700 hover:border-slate-500"
                onClick={() => { setShowDeleteModal(false); setDeletePass('') }}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="flex-1 justify-center bg-red-600 hover:bg-red-500"
                loading={deletingAccount}
                disabled={!deletePass}
                onClick={handleDeleteAccount}
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
