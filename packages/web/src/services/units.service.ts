import api from './api';

export const unitsService = {
  getByBuilding: (buildingId: number) =>
    api.get('/properties/units', { params: { buildingId } }),
  getById: (id: number) => api.get(`/properties/units/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post('/properties/units', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/properties/units/${id}`, data),
  delete: (id: number) => api.delete(`/properties/units/${id}`),
};
