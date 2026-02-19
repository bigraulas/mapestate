import api from './api';

export const usersService = {
  getAll: (page = 1, limit = 20) =>
    api.get('/users', { params: { page, limit } }),

  getById: (id: number) => api.get(`/users/${id}`),

  create: (data: Record<string, unknown>) => api.post('/users', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/users/${id}`, data),

  delete: (id: number) => api.delete(`/users/${id}`),

  portfolioCount: (userId: number) =>
    api.get(`/users/${userId}/portfolio-count`),

  bulkReassignPortfolio: (fromUserId: number, toUserId: number) =>
    api.post('/users/bulk-reassign-portfolio', { fromUserId, toUserId }),
};
