import api from './api';

export const labelsService = {
  getAll: () => api.get('/contacts/labels'),
  create: (data: Record<string, unknown>) =>
    api.post('/contacts/labels', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/contacts/labels/${id}`, data),
  delete: (id: number) => api.delete(`/contacts/labels/${id}`),
};
