import api from './api';

export const auditService = {
  getAll: (params: {
    page?: number;
    limit?: number;
    entity?: string;
    userId?: number;
    dateFrom?: string;
    dateTo?: string;
  } = {}) =>
    api.get('/audit', { params }),
};
