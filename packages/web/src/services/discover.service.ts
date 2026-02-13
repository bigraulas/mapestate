import api from './api';

export interface DiscoveredProperty {
  osmId: number;
  name: string;
  lat: number;
  lng: number;
  type: 'warehouse' | 'industrial' | 'logistics' | 'commercial';
  address?: string;
  city?: string;
  county?: string;
  operator?: string;
  sqm?: number;
  tags: Record<string, string>;
}

export const discoverService = {
  getAll: (bounds?: {
    south: number;
    west: number;
    north: number;
    east: number;
  }) => api.get<DiscoveredProperty[]>('/properties/discover', { params: bounds }),

  refresh: () =>
    api.get<DiscoveredProperty[]>('/properties/discover', {
      params: { refresh: 'true' },
    }),

  importProperty: (data: {
    osmId: number;
    name: string;
    lat: number;
    lng: number;
    type: string;
    address?: string;
    city?: string;
    county?: string;
    operator?: string;
    sqm?: number;
    locationId: number;
    transactionType?: string;
    ownerName?: string;
    ownerPhone?: string;
    ownerEmail?: string;
    minContractYears?: number;
  }) => api.post('/properties/discover/import', data),
};
