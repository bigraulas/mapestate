import { useState, useEffect, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { auditService } from '@/services/audit.service';
import { usersService } from '@/services/users.service';
import DataTable, { type Column } from '@/components/shared/DataTable';
import Pagination from '@/components/shared/Pagination';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entityId: number;
  userId: number;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: AuditUser;
}

interface BrokerOption {
  id: number;
  firstName: string;
  lastName: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creare',
  UPDATE: 'Actualizare',
  DELETE: 'Stergere',
  STATUS_CHANGE: 'Schimbare status',
  REASSIGN: 'Reasignare',
  SEND_OFFER: 'Trimitere oferta',
};

const ACTION_BADGE: Record<string, string> = {
  CREATE: 'bg-green-50 text-green-700',
  UPDATE: 'bg-blue-50 text-blue-700',
  DELETE: 'bg-red-50 text-red-700',
  STATUS_CHANGE: 'bg-amber-50 text-amber-700',
  REASSIGN: 'bg-purple-50 text-purple-700',
  SEND_OFFER: 'bg-teal-50 text-teal-700',
};

const ENTITY_LABELS: Record<string, string> = {
  DEAL: 'Deal',
  BUILDING: 'Proprietate',
  OFFER: 'Oferta',
  USER: 'Utilizator',
  SETTINGS: 'Setari',
};

const ENTITY_OPTIONS = [
  { value: '', label: 'Toate' },
  { value: 'DEAL', label: 'Deal' },
  { value: 'BUILDING', label: 'Proprietate' },
  { value: 'OFFER', label: 'Oferta' },
  { value: 'USER', label: 'Utilizator' },
  { value: 'SETTINGS', label: 'Setari' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

const DETAIL_KEY_LABELS: Record<string, string> = {
  name: 'Nume',
  dealName: 'Deal',
  type: 'Tip',
  from: 'De la',
  to: 'La',
  fromUserId: 'De la broker',
  toUserId: 'La broker',
  buildingCount: 'Nr. proprietati',
  buildings: 'Proprietati',
  recipients: 'Destinatari',
  emailStatus: 'Status email',
};

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details || typeof details !== 'object') return '-';
  const entries = Object.entries(details);
  if (entries.length === 0) return '-';
  return entries
    .map(([key, value]) => `${DETAIL_KEY_LABELS[key] || key}: ${String(value ?? '')}`)
    .join(' · ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AuditLogPage() {
  const { isAdmin } = useAuth();

  const [rows, setRows] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [entityFilter, setEntityFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Broker dropdown options
  const [brokers, setBrokers] = useState<BrokerOption[]>([]);

  // ----- Load broker list for filter -----

  useEffect(() => {
    const loadBrokers = async () => {
      try {
        const res = await usersService.getAll(1, 100);
        const body = res.data;
        setBrokers(
          (body.data ?? []).map((u: AuditUser) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
          })),
        );
      } catch {
        setBrokers([]);
      }
    };
    loadBrokers();
  }, []);

  // ----- Data fetching -----

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (entityFilter) params.entity = entityFilter;
      if (userFilter) params.userId = Number(userFilter);
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const res = await auditService.getAll(params as Parameters<typeof auditService.getAll>[0]);
      const body = res.data;
      setRows(body.data ?? []);
      setTotalPages(body.meta?.totalPages ?? 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, entityFilter, userFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [entityFilter, userFilter, dateFrom, dateTo]);

  // ----- Table columns -----

  const columns: Column<AuditLog>[] = [
    {
      key: 'createdAt',
      header: 'Data/Ora',
      render: (r) => (
        <span className="text-xs text-slate-600 whitespace-nowrap">
          {formatDateTime(r.createdAt)}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Broker',
      render: (r) =>
        r.user
          ? `${r.user.firstName} ${r.user.lastName}`
          : '-',
    },
    {
      key: 'action',
      header: 'Actiune',
      render: (r) => (
        <span
          className={`badge ${ACTION_BADGE[r.action] ?? 'bg-gray-50 text-gray-700'}`}
        >
          {ACTION_LABELS[r.action] ?? r.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Entitate',
      render: (r) => (
        <span className="text-sm text-slate-700">
          {ENTITY_LABELS[r.entity] ?? r.entity}
          <span className="text-slate-400 ml-1">#{r.entityId}</span>
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Detalii',
      render: (r) => (
        <span className="text-xs text-slate-500 max-w-xs truncate block">
          {formatDetails(r.details)}
        </span>
      ),
    },
  ];

  // ----- Guard: admin only -----

  if (!isAdmin) {
    return (
      <div className="page-container">
        <div className="card p-12 text-center">
          <p className="text-sm text-slate-400">
            Nu aveti permisiunea de a accesa aceasta pagina.
          </p>
        </div>
      </div>
    );
  }

  // ----- Render -----

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="page-title">Jurnal de activitate</h1>
            <p className="page-subtitle">
              Istoric complet al actiunilor din sistem
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
          <div>
            <label htmlFor="filter-entity" className="label">
              Entitate
            </label>
            <select
              id="filter-entity"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="input"
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-broker" className="label">
              Broker
            </label>
            <select
              id="filter-broker"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="input"
            >
              <option value="">Toti</option>
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.firstName} {b.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-from" className="label">
              De la
            </label>
            <input
              id="filter-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="filter-to" className="label">
              Pana la
            </label>
            <input
              id="filter-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          emptyMessage="Nu exista inregistrari in jurnal."
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
