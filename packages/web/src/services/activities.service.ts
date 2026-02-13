import api from './api';

export const activitiesService = {
  getAll: (page = 1, limit = 20) =>
    api.get('/activities', { params: { page, limit } }),

  getById: (id: number) => api.get(`/activities/${id}`),

  create: (data: Record<string, unknown>) => api.post('/activities', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/activities/${id}`, data),

  delete: (id: number) => api.delete(`/activities/${id}`),

  getMyPlanned: (page = 1, limit = 20) =>
    api.get('/activities/my/planned', { params: { page, limit } }),

  getMyDone: (page = 1, limit = 20) =>
    api.get('/activities/my/done', { params: { page, limit } }),

  getMyOverdue: (page = 1, limit = 20) =>
    api.get('/activities/my/overdue', { params: { page, limit } }),

  getOverdueCount: () => api.get('/activities/overdue-count'),

  filter: (filters: Record<string, unknown>, page = 1, limit = 20) =>
    api.post('/activities/filter', filters, { params: { page, limit } }),
};
