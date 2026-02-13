import api from './api';

export const dashboardService = {
  getKpis: () => api.get('/dashboard/kpis'),
  getMonthlySales: () => api.get('/dashboard/monthly-sales'),
  getPipeline: () => api.get('/dashboard/pipeline'),
  getExpiringLeases: () => api.get('/dashboard/expiring-leases'),
};
