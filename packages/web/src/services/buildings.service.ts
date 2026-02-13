import api from './api';

export const buildingsService = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/properties/buildings', { params }),
  getById: (id: number) => api.get(`/properties/buildings/${id}`),
  getForMap: () => api.get('/properties/buildings/map'),
  create: (data: Record<string, unknown>) =>
    api.post('/properties/buildings', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/properties/buildings/${id}`, data),
  delete: (id: number) => api.delete(`/properties/buildings/${id}`),
  filter: (data: Record<string, unknown>) =>
    api.post('/properties/buildings/filter', data),
};
