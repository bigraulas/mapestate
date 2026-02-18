import api from './api';

export const personsService = {
  getAll: (params: { page?: number; limit?: number } = {}) =>
    api.get('/contacts/persons', { params: { page: params.page ?? 1, limit: params.limit ?? 100 } }),

  getById: (id: number) => api.get(`/contacts/persons/${id}`),

  search: (q: string) =>
    api.get('/contacts/persons/search', { params: { q } }),

  create: (data: Record<string, unknown>) =>
    api.post('/contacts/persons', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/contacts/persons/${id}`, data),

  delete: (id: number) => api.delete(`/contacts/persons/${id}`),

  reassign: (id: number, userId: number) =>
    api.patch(`/contacts/persons/${id}/reassign`, { userId }),

  bulkReassign: (fromUserId: number, toUserId: number) =>
    api.post('/contacts/persons/bulk-reassign', { fromUserId, toUserId }),
};
