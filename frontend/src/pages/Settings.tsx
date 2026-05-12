import { useState, useEffect } from 'react';
import {
  User, Lock, Bell, Palette, Download, Trash2,
  Save, Eye, EyeOff, ChevronRight, Shield, Globe
} from 'lucide-react';
import { settingsService, Profile, Preferences } from '../services/settingsService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

type Tab = 'profile' | 'security' | 'preferences' | 'notifications' | 'danger';

export default function Settings() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Profile
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Password
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false, new: false, confirm: false
  });
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Preferences
  const [prefs, setPrefs] = useState<Preferences>({
    currency: 'BRL', theme: 'light', language: 'pt-BR', notificationsEnabled: true
  });
  const [loadingPrefs, setLoadingPrefs] = useState(false);

  // Delete account
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    loadProfile();
    loadPreferences();
  }, []);

  async function loadProfile() {
    try {
      const data = await settingsService.getProfile();
      setProfile(data);
      setProfileForm({ name: data.name, email: data.email });
    } catch {
      toast.error('Erro ao carregar perfil');
    }
  }

  async function loadPreferences() {
    try {
      const data = await settingsService.getPreferences();
      setPrefs(data);
    } catch {
      toast.error('Erro ao carregar preferências');
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoadingProfile(true);
    try {
      await settingsService.updateProfile(profileForm);
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar perfil');
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoadingPassword(true);
    try {
      await settingsService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      toast.success('Senha alterada com sucesso!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao alterar senha');
    } finally {
      setLoadingPassword(false);
    }
  }

  async function handleSavePreferences() {
    setLoadingPrefs(true);
    try {
      await settingsService.updatePreferences(prefs);
      toast.success('Preferências salvas!');
    } catch {
      toast.error('Erro ao salvar preferências');
    } finally {
      setLoadingPrefs(false);
    }
  }

  async function handleExportData() {
    try {
      const data = await settingsService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus-dados-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Dados exportados com sucesso!');
    } catch {
      toast.error('Erro ao exportar dados');
    }
  }

  async function handleDeleteAccount() {
    setLoadingDelete(true);
    try {
      await settingsService.deleteAccount(deletePassword);
      toast.success('Conta excluída.');
      logout();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao excluir conta');
    } finally {
      setLoadingDelete(false);
    }
  }

  const tabs = [
    { id: 'profile' as Tab, label: 'Perfil', icon: User },
    { id: 'security' as Tab, label: 'Segurança', icon: Lock },
    { id: 'preferences' as Tab, label: 'Preferências', icon: Palette },
    { id: 'notifications' as Tab, label: 'Notificações', icon: Bell },
    { id: 'danger' as Tab, label: 'Conta', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-500 mt-1">Gerencie sua conta e preferências</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0">
            <nav className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors
                      ${activeTab === tab.id
                        ? 'bg-indigo-50 text-indigo-600 font-medium border-l-4 border-indigo-600'
                        : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                      }
                      ${tab.id === 'danger' ? 'text-red-500 hover:bg-red-50' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} />
                      <span className="text-sm">{tab.label}</span>
                    </div>
                    <ChevronRight size={14} className="opacity-40" />
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1">
            {/* PERFIL */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">Informações do Perfil</h2>

                {/* Avatar */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold">
                    {profileForm.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{profileForm.name}</p>
                    <p className="text-sm text-gray-500">{profileForm.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Membro desde {profile?.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loadingProfile}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
                    >
                      <Save size={16} />
                      {loadingProfile ? 'Salvando...' : 'Salvar alterações'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SEGURANÇA */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">Alterar Senha</h2>
                <form onSubmit={handleChangePassword} className="space-y-5">
                  {(['current', 'new', 'confirm'] as const).map((field) => {
                    const labels = { current: 'Senha atual', new: 'Nova senha', confirm: 'Confirmar nova senha' };
                    const keys = { current: 'currentPassword', new: 'newPassword', confirm: 'confirmPassword' } as const;
                    return (
                      <div key={field}>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {labels[field]}
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords[field] ? 'text' : 'password'}
                            value={passwordForm[keys[field]]}
                            onChange={e => setPasswordForm(p => ({ ...p, [keys[field]]: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm pr-11 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(p => ({ ...p, [field]: !p[field] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPasswords[field] ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loadingPassword}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
                    >
                      <Lock size={16} />
                      {loadingPassword ? 'Alterando...' : 'Alterar senha'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* PREFERÊNCIAS */}
            {activeTab === 'preferences' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">Preferências</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Globe size={14} className="inline mr-1" /> Moeda padrão
                    </label>
                    <select
                      value={prefs.currency}
                      onChange={e => setPrefs(p => ({ ...p, currency: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="BRL">🇧🇷 Real Brasileiro (R$)</option>
                      <option value="USD">🇺🇸 Dólar Americano ($)</option>
                      <option value="EUR">🇪🇺 Euro (€)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Palette size={14} className="inline mr-1" /> Tema
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'light', label: '☀️ Claro' },
                        { value: 'dark', label: '🌙 Escuro' },
                        { value: 'system', label: '💻 Sistema' },
                      ].map(t => (
                        <button
                          key={t.value}
                          onClick={() => setPrefs(p => ({ ...p, theme: t.value }))}
                          className={`py-3 rounded-xl text-sm font-medium border-2 transition-all
                            ${prefs.theme === t.value
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Idioma
                    </label>
                    <select
                      value={prefs.language}
                      onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                      <option value="en-US">🇺🇸 English (US)</option>
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSavePreferences}
                      disabled={loadingPrefs}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
                    >
                      <Save size={16} />
                      {loadingPrefs ? 'Salvando...' : 'Salvar preferências'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICAÇÕES */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">Notificações</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Notificações gerais', desc: 'Receba alertas sobre atividades na sua conta', key: 'notificationsEnabled' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => setPrefs(p => ({ ...p, [item.key]: !p[item.key as keyof Preferences] }))}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          prefs[item.key as keyof Preferences] ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          prefs[item.key as keyof Preferences] ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleSavePreferences}
                    disabled={loadingPrefs}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    <Save size={16} />
                    {loadingPrefs ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}

            {/* CONTA / PERIGO */}
            {activeTab === 'danger' && (
              <div className="space-y-4">
                {/* Export */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">Exportar meus dados</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Baixe todos os seus dados em formato JSON.
                      </p>
                    </div>
                    <button
                      onClick={handleExportData}
                      className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      <Download size={16} />
                      Exportar
                    </button>
                  </div>
                </div>

                {/* Delete */}
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-red-600">Excluir minha conta</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Esta ação é <strong>irreversível</strong>. Todos os seus dados serão permanentemente excluídos.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modal Excluir Conta */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Confirmar exclusão</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Digite sua senha para confirmar a exclusão permanente da sua conta e todos os seus dados.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              placeholder="Sua senha"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={!deletePassword || loadingDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
              >
                {loadingDelete ? 'Excluindo...' : 'Excluir conta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
