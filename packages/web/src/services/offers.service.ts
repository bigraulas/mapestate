import api from './api';

export const offersService = {
  getAll: (page = 1, limit = 20) =>
    api.get('/offers', { params: { page, limit } }),

  getById: (id: number) => api.get(`/offers/${id}`),

  getByRequest: (requestId: number) =>
    api.get(`/offers/by-request/${requestId}`),

  create: (data: { requestId: number }) => api.post('/offers', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/offers/${id}`, data),

  delete: (id: number) => api.delete(`/offers/${id}`),

  download: (id: number) => api.get(`/offers/${id}/download`),

  createGroup: (offerId: number, data: Record<string, unknown>) =>
    api.post(`/offers/${offerId}/groups`, data),

  updateGroup: (groupId: number, data: Record<string, unknown>) =>
    api.patch(`/offers/groups/${groupId}`, data),

  removeGroup: (groupId: number) => api.delete(`/offers/groups/${groupId}`),

  findGroup: (groupId: number) => api.get(`/offers/groups/${groupId}`),
};
