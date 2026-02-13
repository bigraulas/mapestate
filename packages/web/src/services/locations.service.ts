import api from './api';

export const locationsService = {
  getAll: () => api.get('/properties/locations'),

  search: (q: string) =>
    api.get('/properties/locations/search', { params: { q } }),
};
