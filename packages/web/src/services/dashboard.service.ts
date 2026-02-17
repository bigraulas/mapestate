import api from './api';

export const dashboardService = {
  getKpis: (brokerId?: number) =>
    api.get('/dashboard/kpis', { params: brokerId ? { brokerId } : {} }),
  getMonthlySales: (brokerId?: number) =>
    api.get('/dashboard/monthly-sales', { params: brokerId ? { brokerId } : {} }),
  getPipeline: (brokerId?: number) =>
    api.get('/dashboard/pipeline', { params: brokerId ? { brokerId } : {} }),
  getExpiringLeases: (brokerId?: number) =>
    api.get('/dashboard/expiring-leases', { params: brokerId ? { brokerId } : {} }),
  getBrokerPerformance: () =>
    api.get('/dashboard/broker-performance'),
};
