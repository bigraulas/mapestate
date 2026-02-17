import api from './api';

export const agenciesService = {
  getAll: () => api.get('/agencies'),
  getOne: (id: number) => api.get(`/agencies/${id}`),
  create: (data: {
    name: string;
    ownerEmail: string;
    ownerFirstName: string;
    ownerLastName: string;
    phone?: string;
    address?: string;
  }) => api.post('/agencies', data),
  updateStatus: (id: number, status: 'ACTIVE' | 'SUSPENDED') =>
    api.patch(`/agencies/${id}/status`, { status }),
  invite: (
    id: number,
    data: { email: string; firstName: string; lastName: string; role?: string },
  ) => api.post(`/agencies/${id}/invite`, data),
};
