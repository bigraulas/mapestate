import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Table2,
  KanbanSquare,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  RequestStatus,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_COLORS,
} from '@mapestate/shared';
import { requestsService } from '@/services/requests.service';
import DataTable, { type Column } from '@/components/shared/DataTable';
import Pagination from '@/components/shared/Pagination';
import StatusBadge from '@/components/shared/StatusBadge';
import Modal from '@/components/shared/Modal';
import RequestFormModal from '@/components/shared/RequestFormModal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestRow {
  id: number;
  name: string;
  numberOfSqm?: number | null;
  estimatedFeeValue?: number | null;
  contractPeriod?: number | null;
  status: RequestStatus;
  requestType?: string | null;
  company?: { id: number; name: string } | null;
  person?: { id: number; name: string } | null;
}

interface BoardColumn {
  status: RequestStatus;
  requests: RequestRow[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOARD_STATUSES: RequestStatus[] = [
  RequestStatus.NEW,
  RequestStatus.OFFERING,
  RequestStatus.TOUR,
  RequestStatus.SHORTLIST,
  RequestStatus.NEGOTIATION,
  RequestStatus.HOT_SIGNED,
];

const ALL_STATUSES: RequestStatus[] = [
  RequestStatus.NEW,
  RequestStatus.OFFERING,
  RequestStatus.TOUR,
  RequestStatus.SHORTLIST,
  RequestStatus.NEGOTIATION,
  RequestStatus.HOT_SIGNED,
  RequestStatus.ON_HOLD,
  RequestStatus.WON,
  RequestStatus.LOST,
];

const TYPE_LABELS: Record<string, string> = {
  RENT: 'Inchiriere',
  SALE: 'Vanzare',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<'table' | 'kanban'>('table');

  // Table state
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Kanban state
  const [boardColumns, setBoardColumns] = useState<BoardColumn[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [wonCount, setWonCount] = useState(0);
  const [lostCount, setLostCount] = useState(0);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestRow | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [lostReason, setLostReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState('');

  // ----- Data fetching -----

  const fetchTable = useCallback(async () => {
    setLoading(true);
    try {
      const res = await requestsService.getAll(page, 20);
      const body = res.data;
      setRows(body.data ?? []);
      setTotalPages(body.meta?.totalPages ?? 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchBoard = useCallback(async () => {
    setBoardLoading(true);
    try {
      const res = await requestsService.getBoard();
      const columns: BoardColumn[] = res.data ?? [];

      const won = columns.find((c) => c.status === RequestStatus.WON);
      const lost = columns.find((c) => c.status === RequestStatus.LOST);
      setWonCount(won?.requests?.length ?? 0);
      setLostCount(lost?.requests?.length ?? 0);

      setBoardColumns(
        columns.filter((c) => BOARD_STATUSES.includes(c.status as RequestStatus)),
      );
    } catch {
      setBoardColumns([]);
    } finally {
      setBoardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'table') {
      fetchTable();
    } else {
      fetchBoard();
    }
  }, [activeTab, fetchTable, fetchBoard]);

  const handleRefresh = () => {
    if (activeTab === 'table') fetchTable();
    else fetchBoard();
  };

  // ----- Status change -----

  const openStatusDialog = (req: RequestRow) => {
    setSelectedRequest(req);
    setNewStatus(req.status);
    setLostReason('');
    setStatusError('');
    setStatusDialogOpen(true);
  };

  const handleStatusSubmit = async () => {
    if (!selectedRequest) return;
    if (newStatus === RequestStatus.LOST && !lostReason.trim()) {
      setStatusError('Motivul pierderii este obligatoriu.');
      return;
    }

    setStatusSubmitting(true);
    setStatusError('');

    try {
      await requestsService.updateStatus(selectedRequest.id, {
        status: newStatus,
        lostReason: newStatus === RequestStatus.LOST ? lostReason : undefined,
      });
      setStatusDialogOpen(false);
      handleRefresh();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Eroare la actualizare status.';
      setStatusError(message);
    } finally {
      setStatusSubmitting(false);
    }
  };

  // ----- Table columns -----

  const tableColumns: Column<RequestRow>[] = [
    { key: 'name', header: 'Nume' },
    {
      key: 'company',
      header: 'Companie',
      render: (r) => r.company?.name ?? '-',
    },
    {
      key: 'person',
      header: 'Persoana contact',
      render: (r) => r.person?.name ?? '-',
    },
    {
      key: 'numberOfSqm',
      header: 'mp',
      render: (r) => (r.numberOfSqm != null ? `${r.numberOfSqm} mp` : '-'),
    },
    {
      key: 'estimatedFeeValue',
      header: 'Fee Estimat',
      render: (r) =>
        r.estimatedFeeValue != null
          ? `${r.estimatedFeeValue.toLocaleString('ro-RO')} \u20AC`
          : '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'requestType',
      header: 'Tip',
      render: (r) =>
        r.requestType ? TYPE_LABELS[r.requestType] ?? r.requestType : '-',
    },
    {
      key: 'contractPeriod',
      header: 'Perioada contract',
      render: (r) =>
        r.contractPeriod != null ? `${r.contractPeriod} luni` : '-',
    },
  ];

  // ----- Render -----

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="page-title">Cereri</h1>
            <p className="page-subtitle">
              Gestioneaza cererile de inchiriere si vanzare
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          <span>Adauga cerere</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-white rounded-lg border border-slate-200 p-1 w-fit">
        <button
          onClick={() => setActiveTab('table')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'table'
              ? 'bg-primary-50 text-primary-700'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Table2 className="w-4 h-4" />
          Tabel
        </button>
        <button
          onClick={() => setActiveTab('kanban')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'kanban'
              ? 'bg-primary-50 text-primary-700'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <KanbanSquare className="w-4 h-4" />
          Kanban Board
        </button>
      </div>

      {/* Table view */}
      {activeTab === 'table' && (
        <div className="card">
          <DataTable
            columns={tableColumns}
            data={rows}
            loading={loading}
            emptyMessage="Nu exista cereri inregistrate. Adauga prima cerere."
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Kanban view */}
      {activeTab === 'kanban' && (
        <>
          {boardLoading ? (
            <div className="flex items-center justify-center py-16">
              <span className="inline-block w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              <span className="ml-2 text-sm text-slate-500">
                Se incarca board-ul...
              </span>
            </div>
          ) : (
            <>
              {/* Board columns */}
              <div className="flex gap-4 overflow-x-auto pb-4">
                {boardColumns.map((col) => {
                  const statusColor =
                    REQUEST_STATUS_COLORS[col.status as RequestStatus] ??
                    '#6B7280';

                  return (
                    <div
                      key={col.status}
                      className="flex-shrink-0 w-72 bg-white rounded-xl border border-slate-200 overflow-hidden"
                    >
                      {/* Column header */}
                      <div
                        className="px-4 py-3 border-b-2 flex items-center justify-between"
                        style={{ borderBottomColor: statusColor }}
                      >
                        <span
                          className="text-sm font-semibold"
                          style={{ color: statusColor }}
                        >
                          {REQUEST_STATUS_LABELS[col.status as RequestStatus] ??
                            col.status}
                        </span>
                        <span className="text-xs font-medium bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                          {col.requests.length}
                        </span>
                      </div>

                      {/* Cards */}
                      <div className="p-3 space-y-3 min-h-[120px]">
                        {col.requests.length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-4">
                            Nicio cerere
                          </p>
                        )}
                        {col.requests.map((req) => (
                          <div
                            key={req.id}
                            onClick={() => openStatusDialog(req)}
                            className="bg-slate-50 rounded-lg p-3 border border-slate-100 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all"
                          >
                            <p className="text-sm font-medium text-slate-800 mb-1 truncate">
                              {req.name}
                            </p>
                            {req.company && (
                              <p className="text-xs text-slate-500 mb-1 truncate">
                                {req.company.name}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              {req.numberOfSqm != null && (
                                <span>{req.numberOfSqm} mp</span>
                              )}
                              {req.estimatedFeeValue != null && (
                                <span>
                                  {req.estimatedFeeValue.toLocaleString('ro-RO')}{' '}
                                  {'\u20AC'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* WON/LOST counts */}
              <div className="flex items-center gap-6 mt-4 px-1">
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <Trophy className="w-4 h-4" />
                  <span className="font-medium">
                    Castigate: {wonCount}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <XCircle className="w-4 h-4" />
                  <span className="font-medium">
                    Pierdute: {lostCount}
                  </span>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Add request modal */}
      <RequestFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleRefresh}
      />

      {/* Status change dialog */}
      <Modal
        isOpen={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        title="Schimba statusul cererii"
      >
        <div className="space-y-4">
          {statusError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {statusError}
            </div>
          )}

          {selectedRequest && (
            <p className="text-sm text-slate-600">
              Cerere: <strong>{selectedRequest.name}</strong>
            </p>
          )}

          <div>
            <label htmlFor="new-status" className="label">
              Status nou
            </label>
            <select
              id="new-status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="input"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REQUEST_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {newStatus === RequestStatus.LOST && (
            <div>
              <label htmlFor="lost-reason" className="label">
                Motivul pierderii *
              </label>
              <textarea
                id="lost-reason"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="input"
                rows={3}
                placeholder="Descrie motivul pierderii cererii..."
                required
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStatusDialogOpen(false)}
              className="btn-secondary"
            >
              Anuleaza
            </button>
            <button
              type="button"
              onClick={handleStatusSubmit}
              disabled={statusSubmitting}
              className="btn-primary"
            >
              {statusSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              <span>{statusSubmitting ? 'Se salveaza...' : 'Salveaza'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
