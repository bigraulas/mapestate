import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Table2, Map, Loader2 } from 'lucide-react';
import type { Building, PaginatedResponse } from '@dunwell/shared';
import { TransactionType } from '@dunwell/shared';
import { buildingsService } from '@/services';
import DataTable, { type Column } from '@/components/shared/DataTable';
import Pagination from '@/components/shared/Pagination';
import { MapboxMap } from '@/components/map';
import type { MapBuilding } from '@/components/map';
import MapSearchBar from '@/components/map/MapSearchBar';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'tabel' | 'harta';

const transactionTypeLabels: Record<string, string> = {
  [TransactionType.RENT]: 'Inchiriere',
  [TransactionType.SALE]: 'Vanzare',
};

const baseColumns: Column<Building>[] = [
  {
    key: 'name',
    header: 'Nume',
    render: (row) => (
      <span className="font-medium text-slate-900">{row.name}</span>
    ),
  },
  {
    key: 'propertyCode',
    header: 'Cod proprietate',
    render: (row) => (
      <span className="text-xs font-mono text-slate-500">
        {row.propertyCode ?? '-'}
      </span>
    ),
  },
  {
    key: 'location',
    header: 'Locatie',
    render: (row) =>
      row.location
        ? `${row.location.name}, ${row.location.county}`
        : row.address ?? '-',
  },
  {
    key: 'totalSqm',
    header: 'mp Total',
    render: (row) =>
      row.totalSqm != null
        ? `${row.totalSqm.toLocaleString('ro-RO')} mp`
        : '-',
  },
  {
    key: 'availableSqm',
    header: 'mp Disponibil',
    render: (row) =>
      row.availableSqm != null
        ? `${row.availableSqm.toLocaleString('ro-RO')} mp`
        : '-',
  },
  {
    key: 'transactionType',
    header: 'Tip tranzactie',
    render: (row) => (
      <span
        className={`badge ${
          row.transactionType === TransactionType.RENT
            ? 'bg-blue-50 text-blue-700'
            : 'bg-emerald-50 text-emerald-700'
        }`}
      >
        {transactionTypeLabels[row.transactionType] ?? row.transactionType}
      </span>
    ),
  },
  {
    key: 'serviceCharge',
    header: 'Service Charge',
    render: (row) =>
      row.serviceCharge != null
        ? `${row.serviceCharge.toFixed(2)} EUR/mp`
        : '-',
  },
];

const brokerColumn: Column<Building> = {
  key: 'user',
  header: 'Broker',
  render: (row: any) =>
    row.user
      ? `${row.user.firstName} ${row.user.lastName}`
      : '-',
};

export default function PropertiesPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('tabel');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Map data
  const [mapBuildings, setMapBuildings] = useState<MapBuilding[]>([]);
  const [mapLoading, setMapLoading] = useState(false);

  // Map flyTo state
  const [flyTo, setFlyTo] = useState<{ lng: number; lat: number; zoom?: number } | null>(null);

  const columns = useMemo(() => {
    if (isAdmin) {
      // Insert broker column after the location column (index 2)
      const cols = [...baseColumns];
      cols.splice(3, 0, brokerColumn);
      return cols;
    }
    return baseColumns;
  }, [isAdmin]);

  const fetchBuildings = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await buildingsService.getAll({ page: p, limit: 20 });
      const payload: PaginatedResponse<Building> = res.data;
      setBuildings(payload.data);
      setTotalPages(payload.meta.totalPages);
    } catch {
      setBuildings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMapBuildings = useCallback(async () => {
    setMapLoading(true);
    try {
      const res = await buildingsService.getForMap();
      setMapBuildings(res.data);
    } catch {
      setMapBuildings([]);
    } finally {
      setMapLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuildings(page);
  }, [page, fetchBuildings]);

  // Fetch map data when switching to map tab
  useEffect(() => {
    if (activeTab === 'harta') {
      fetchMapBuildings();
    }
  }, [activeTab, fetchMapBuildings]);

  const handleBuildingSearchSelect = useCallback(
    (b: MapBuilding) => {
      setFlyTo({ lng: b.longitude!, lat: b.latitude!, zoom: 15 });
    },
    [],
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="page-title">Proprietati</h1>
            <p className="page-subtitle">
              Gestioneaza cladirile si spatiile disponibile
            </p>
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate('/proprietati/nou')}
        >
          <Plus className="w-4 h-4" />
          <span>Adauga proprietate</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('tabel')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === 'tabel'
                  ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Table2 className="w-4 h-4" />
              Tabel
            </button>
            <button
              onClick={() => setActiveTab('harta')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === 'harta'
                  ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Map className="w-4 h-4" />
              Harta
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100">
          {activeTab === 'tabel' ? (
            <>
              <DataTable<Building>
                columns={columns}
                data={buildings}
                loading={loading}
                emptyMessage="Nu exista proprietati inregistrate."
                onRowClick={(row) => navigate(`/proprietati/${row.id}`)}
              />
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
              />
            </>
          ) : (
            <div className="relative" style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}>
              {mapLoading && mapBuildings.length === 0 && (
                <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-b-lg">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                    <span className="text-sm text-slate-500">Se incarca...</span>
                  </div>
                </div>
              )}

              {/* Search bar */}
              <MapSearchBar
                buildings={mapBuildings}
                onBuildingSelect={handleBuildingSearchSelect}
              />

              <MapboxMap
                buildings={mapBuildings}
                onBuildingClick={(id) => navigate(`/proprietati/${id}`)}
                flyTo={flyTo}
              />

              {/* Legend */}
              <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-slate-200">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Legenda</p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-200" />
                    <span className="text-xs text-slate-600">Inchiriere</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                    <span className="text-xs text-slate-600">Vanzare</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
