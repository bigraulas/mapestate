import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Table2,
  KanbanSquare,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  RequestStatus,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_COLORS,
} from '@mapestate/shared';
import { useAuth } from '@/hooks/useAuth';
import { dealsService } from '@/services/deals.service';
import { usersService } from '@/services/users.service';
import DataTable, { type Column } from '@/components/shared/DataTable';
import Pagination from '@/components/shared/Pagination';
// StatusBadge no longer used – inline dropdown replaces it
import Modal from '@/components/shared/Modal';
import RequestFormModal from '@/components/shared/RequestFormModal';
import ColdSalesModal from '@/components/shared/ColdSalesModal';

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
  dealType?: string;
  company?: { id: number; name: string } | null;
  person?: { id: number; name: string } | null;
  user?: { id: number; firstName: string; lastName: string; email: string } | null;
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

export default function DealsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'table' | 'kanban'>('table');

  // Admin state
  const [brokers, setBrokers] = useState<{id: number; firstName: string; lastName: string}[]>([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState<number | undefined>(undefined);

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
  const [coldSalesOpen, setColdSalesOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestRow | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [lostReason, setLostReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState('');

  // ----- Fetch brokers (admin only) -----

  useEffect(() => {
    if (!isAdmin) return;
    usersService.getAll(1, 100).then((res) => {
      setBrokers(res.data?.data ?? []);
    }).catch(() => {});
  }, [isAdmin]);

  // ----- Data fetching -----

  const fetchTable = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dealsService.getMy(page, 20, selectedBrokerId);
      const body = res.data;
      setRows(body.data ?? []);
      setTotalPages(body.meta?.totalPages ?? 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, selectedBrokerId]);

  const fetchBoard = useCallback(async () => {
    setBoardLoading(true);
    try {
      const res = await dealsService.getBoard(selectedBrokerId);
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
  }, [selectedBrokerId]);

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

  /** Inline status change from the table dropdown */
  const handleInlineStatusChange = async (req: RequestRow, status: string) => {
    // LOST needs a reason → open the modal instead
    if (status === RequestStatus.LOST) {
      setSelectedRequest(req);
      setNewStatus(RequestStatus.LOST);
      setLostReason('');
      setStatusError('');
      setStatusDialogOpen(true);
      return;
    }

    // Optimistic update in local state
    setRows((prev) =>
      prev.map((r) =>
        r.id === req.id ? { ...r, status: status as RequestStatus } : r,
      ),
    );

    try {
      await dealsService.updateStatus(req.id, { status });
    } catch {
      // Revert on failure & refetch
      fetchTable();
    }
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
      await dealsService.updateStatus(selectedRequest.id, {
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
      key: 'dealType',
      header: 'Tip Deal',
      render: (r) => (
        <span className={`inline-flex items-center justify-center text-xs font-semibold px-3 py-1.5 rounded-md leading-tight text-center whitespace-pre-line ${
          r.dealType === 'COLD_SALES'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {r.dealType === 'COLD_SALES' ? 'Ofertare\nin Masa' : 'Cerere\nNoua'}
        </span>
      ),
    },
    ...(isAdmin ? [{
      key: 'user' as const,
      header: 'Broker',
      render: (r: RequestRow) => r.user ? `${r.user.firstName} ${r.user.lastName}` : '-',
    }] : []),
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
      render: (r) => {
        const color = REQUEST_STATUS_COLORS[r.status] ?? '#6B7280';
        return (
          <select
            value={r.status}
            onChange={(e) => {
              e.stopPropagation();
              handleInlineStatusChange(r, e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-medium rounded-md border-0 py-1 pl-2 pr-7 cursor-pointer focus:ring-2 focus:ring-primary-500"
            style={{
              backgroundColor: `${color}18`,
              color,
            }}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REQUEST_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        );
      },
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="page-title">Deals</h1>
            <p className="page-subtitle">
              Gestioneaza deal-urile de inchiriere si vanzare
            </p>
          </div>
        </div>
        {isAdmin && (
          <select
            value={selectedBrokerId ?? ''}
            onChange={(e) => setSelectedBrokerId(e.target.value ? Number(e.target.value) : undefined)}
            className="input !w-auto sm:min-w-[180px]"
          >
            <option value="">Toti brokerii</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>{b.firstName} {b.lastName}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-2">
          <button className="btn-primary" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4" />
            <span>Cerere Noua</span>
          </button>
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            onClick={() => setColdSalesOpen(true)}
          >
            <Zap className="w-4 h-4" />
            <span>Ofertare in Masa</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-white rounded-lg border border-slate-200 p-1 w-fit overflow-x-auto">
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
            emptyMessage="Nu exista deal-uri inregistrate. Adauga primul deal."
            onRowClick={(row) => navigate(`/deals/${row.id}`)}
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
                            Niciun deal
                          </p>
                        )}
                        {col.requests.map((req) => (
                          <div
                            key={req.id}
                            onClick={() => openStatusDialog(req)}
                            className="bg-slate-50 rounded-lg p-3 border border-slate-100 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-slate-800 truncate flex-1">
                                {req.name}
                              </p>
                              {req.dealType === 'COLD_SALES' && (
                                <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shrink-0">
                                  Masa
                                </span>
                              )}
                            </div>
                            {req.company && (
                              <p className="text-xs text-slate-500 mb-1 truncate">
                                {req.company.name}
                              </p>
                            )}
                            {isAdmin && req.user && (
                              <p className="text-[10px] text-primary-600 truncate">
                                {req.user.firstName} {req.user.lastName}
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

      {/* Add deal from request modal */}
      <RequestFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleRefresh}
      />

      <ColdSalesModal
        isOpen={coldSalesOpen}
        onClose={() => setColdSalesOpen(false)}
        onSuccess={handleRefresh}
      />

      {/* Status change dialog */}
      <Modal
        isOpen={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        title="Schimba statusul deal-ului"
      >
        <div className="space-y-4">
          {statusError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {statusError}
            </div>
          )}

          {selectedRequest && (
            <p className="text-sm text-slate-600">
              Deal: <strong>{selectedRequest.name}</strong>
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
                placeholder="Descrie motivul pierderii deal-ului..."
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
