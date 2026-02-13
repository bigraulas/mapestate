import api from './api';

export const companiesService = {
  getAll: (page = 1, limit = 100) =>
    api.get('/contacts/companies', { params: { page, limit } }),

  getById: (id: number) => api.get(`/contacts/companies/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post('/contacts/companies', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/contacts/companies/${id}`, data),

  delete: (id: number) => api.delete(`/contacts/companies/${id}`),

  filter: (name: string, page = 1, limit = 20) =>
    api.post('/contacts/companies/filter', { name, page, limit }),
};
