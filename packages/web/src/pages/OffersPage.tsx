import { useState, useEffect, useCallback } from 'react';
import {
  FileCheck,
  Plus,
  Download,
  Check,
  X,
} from 'lucide-react';
import { offersService } from '@/services/offers.service';
import { requestsService } from '@/services/requests.service';
import { useAuth } from '@/hooks/useAuth';
import DataTable, { type Column } from '@/components/shared/DataTable';
import Pagination from '@/components/shared/Pagination';
import Modal from '@/components/shared/Modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OfferRow {
  id: number;
  offerCode: string;
  downloadable: boolean;
  requestedSqm?: number | null;
  createdAt: string;
  request?: {
    id: number;
    name: string;
    company?: { id: number; name: string } | null;
  } | null;
  company?: { id: number; name: string } | null;
  offerGroups?: { id: number }[];
  user?: { id: number; firstName: string; lastName: string; email?: string } | null;
}

interface RequestOption {
  id: number;
  name: string;
  company?: { name: string } | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OffersPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [requests, setRequests] = useState<RequestOption[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // ----- Data fetching -----

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await offersService.getAll(page, 20);
      const body = res.data;
      setRows(body.data ?? []);
      setTotalPages(body.meta?.totalPages ?? 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Load requests for create modal
  const openCreateModal = async () => {
    setCreateOpen(true);
    setSelectedRequestId('');
    setCreateError('');

    try {
      const res = await requestsService.getAll(1, 200);
      const body = res.data;
      setRequests(body.data ?? []);
    } catch {
      setRequests([]);
    }
  };

  const handleCreate = async () => {
    if (!selectedRequestId) {
      setCreateError('Selecteaza o cerere.');
      return;
    }

    setCreateSubmitting(true);
    setCreateError('');

    try {
      await offersService.create({ requestId: Number(selectedRequestId) });
      setCreateOpen(false);
      fetchOffers();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Eroare la creare oferta.';
      setCreateError(message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleRowClick = (row: OfferRow) => {
    alert(`Oferta ${row.offerCode} - Detalii (in curand)`);
  };

  // ----- Format helpers -----

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('ro-RO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  // ----- Table columns -----

  const columns: Column<OfferRow>[] = [
    { key: 'offerCode', header: 'Cod Oferta' },
    {
      key: 'request',
      header: 'Cerere',
      render: (r) => r.request?.name ?? '-',
    },
    {
      key: 'company',
      header: 'Companie',
      render: (r) => r.request?.company?.name ?? r.company?.name ?? '-',
    },
    {
      key: 'requestedSqm',
      header: 'mp Solicitate',
      render: (r) =>
        r.requestedSqm != null ? `${r.requestedSqm} mp` : '-',
    },
    {
      key: 'createdAt',
      header: 'Data crearii',
      render: (r) => formatDate(r.createdAt),
    },
    {
      key: 'downloadable',
      header: 'Descarcabil',
      render: (r) =>
        r.downloadable ? (
          <span className="inline-flex items-center gap-1 text-green-600">
            <Check className="w-4 h-4" />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-slate-400">
            <X className="w-4 h-4" />
          </span>
        ),
    },
    {
      key: 'offerGroups',
      header: 'Nr. Grupuri',
      render: (r) => r.offerGroups?.length ?? 0,
    },
    ...(isAdmin ? [{
      key: 'user' as keyof OfferRow,
      header: 'Agent',
      render: (r: OfferRow) => {
        const u = r.user;
        return u ? `${u.firstName} ${u.lastName}` : '-';
      },
    }] : []),
  ];

  // ----- Render -----

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <FileCheck className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="page-title">Oferte</h1>
            <p className="page-subtitle">
              Gestioneaza ofertele trimise clientilor
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          <span>Creeaza oferta</span>
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          emptyMessage="Nu exista oferte create. Creeaza prima oferta."
          onRowClick={handleRowClick}
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Create offer modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Creeaza oferta noua"
      >
        <div className="space-y-4">
          {createError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {createError}
            </div>
          )}

          <div>
            <label htmlFor="offer-request" className="label">
              Selecteaza cererea *
            </label>
            <select
              id="offer-request"
              value={selectedRequestId}
              onChange={(e) => setSelectedRequestId(e.target.value)}
              className="input"
            >
              <option value="">-- Selecteaza cererea --</option>
              {requests.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.name}
                  {req.company ? ` (${req.company.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="btn-secondary"
            >
              Anuleaza
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={createSubmitting}
              className="btn-primary"
            >
              {createSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>
                {createSubmitting ? 'Se creeaza...' : 'Creeaza oferta'}
              </span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
