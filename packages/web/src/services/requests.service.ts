import api from './api';

export const requestsService = {
  getAll: (page = 1, limit = 20) =>
    api.get('/requests', { params: { page, limit } }),

  getMy: (page = 1, limit = 20) =>
    api.get('/requests/my', { params: { page, limit } }),

  getBoard: () => api.get('/requests/my/board'),

  getById: (id: number) => api.get(`/requests/${id}`),

  create: (data: Record<string, unknown>) => api.post('/requests', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/requests/${id}`, data),

  delete: (id: number) => api.delete(`/requests/${id}`),

  updateStatus: (id: number, data: { status: string; lostReason?: string }) =>
    api.patch(`/requests/${id}/status`, data),

  filter: (filters: Record<string, unknown>, page = 1, limit = 20) =>
    api.post('/requests/filter', filters, { params: { page, limit } }),

  getActiveStats: () => api.get('/requests/stats/active'),
  getClosedStats: () => api.get('/requests/stats/closed'),
};
