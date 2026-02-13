import api from './api';

export const personsService = {
  getAll: (page = 1, limit = 100) =>
    api.get('/contacts/persons', { params: { page, limit } }),

  getById: (id: number) => api.get(`/contacts/persons/${id}`),

  search: (q: string) =>
    api.get('/contacts/persons/search', { params: { q } }),

  create: (data: Record<string, unknown>) =>
    api.post('/contacts/persons', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/contacts/persons/${id}`, data),

  delete: (id: number) => api.delete(`/contacts/persons/${id}`),
};
