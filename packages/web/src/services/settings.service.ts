import api from './api';

export const settingsService = {
  getAgency: () => api.get('/settings/agency'),
  updateAgency: (data: Record<string, unknown>) =>
    api.patch('/settings/agency', data),
  uploadImage: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<{ url: string }>('/properties/uploads', fd);
  },
};
