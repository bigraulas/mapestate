import api from './api';

export const dealsService = {
  // Reuse existing request endpoints (they ARE deals)
  getAll: (page = 1, limit = 20) =>
    api.get('/requests', { params: { page, limit } }),

  getMy: (page = 1, limit = 20, brokerId?: number) =>
    api.get('/requests/my', { params: { page, limit, ...(brokerId ? { brokerId } : {}) } }),

  getBoard: (brokerId?: number) =>
    api.get('/requests/my/board', { params: brokerId ? { brokerId } : {} }),

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

  // New deal-specific endpoints
  getMatches: (dealId: number) => api.get(`/requests/${dealId}/matches`),

  createColdSales: (data: {
    buildingIds: number[];
    recipientPersonIds: number[];
    message?: string;
  }) => api.post('/requests/cold-sales', data),

  sendOffers: (data: {
    dealId: number;
    buildingIds: number[];
    message?: string;
  }) => api.post('/offers/send', data),

  downloadPdf: (dealId: number) =>
    api.get(`/offers/deal/${dealId}/pdf`, { responseType: 'blob' }),

  downloadPdfForBuildings: (dealId: number, buildingIds: number[]) =>
    api.get(`/offers/deal/${dealId}/pdf?buildingIds=${buildingIds.join(',')}`, {
      responseType: 'blob',
    }),

  createPdfLink: (dealId: number, buildingIds: number[]) =>
    api.post<{ token: string }>(`/offers/deal/${dealId}/pdf-link`, { buildingIds }),

  reassign: (id: number, userId: number) =>
    api.patch(`/requests/${id}/reassign`, { userId }),
};
