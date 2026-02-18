import api from './api';

export const companiesService = {
  getAll: (params: { page?: number; limit?: number } = {}) =>
    api.get('/contacts/companies', { params: { page: params.page ?? 1, limit: params.limit ?? 100 } }),

  getById: (id: number) => api.get(`/contacts/companies/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post('/contacts/companies', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/contacts/companies/${id}`, data),

  delete: (id: number) => api.delete(`/contacts/companies/${id}`),

  filter: (name: string, page = 1, limit = 20) =>
    api.post('/contacts/companies/filter', { name, page, limit }),

  lookupCui: (cui: string) =>
    api.get(`/contacts/companies/lookup-cui/${encodeURIComponent(cui)}`),

  reassign: (id: number, userId: number) =>
    api.patch(`/contacts/companies/${id}/reassign`, { userId }),

  bulkReassign: (fromUserId: number, toUserId: number) =>
    api.post('/contacts/companies/bulk-reassign', { fromUserId, toUserId }),
};
