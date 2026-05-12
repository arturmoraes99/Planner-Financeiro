import api from './api';

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Preferences {
  currency: string;
  theme: string;
  language: string;
  notificationsEnabled: boolean;
}

export const settingsService = {
  getProfile: () => api.get<Profile>('/settings/profile').then(r => r.data),

  updateProfile: (data: Partial<Profile>) =>
    api.put<Profile>('/settings/profile', data).then(r => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/settings/password', { currentPassword, newPassword }).then(r => r.data),

  getPreferences: () =>
    api.get<Preferences>('/settings/preferences').then(r => r.data),

  updatePreferences: (data: Partial<Preferences>) =>
    api.put<Preferences>('/settings/preferences', data).then(r => r.data),

  deleteAccount: (password: string) =>
    api.delete('/settings/account', { data: { password } }).then(r => r.data),

  exportData: () =>
    api.get('/settings/export').then(r => r.data),
};
