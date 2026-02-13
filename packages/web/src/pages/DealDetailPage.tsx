import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileDown,
  RefreshCw,
  Building2,
  FileText,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import {
  RequestStatus,
  REQUEST_STATUS_LABELS,
  DealType,
  DEAL_TYPE_LABELS,
  ACTIVITY_TYPE_LABELS,
} from '@dunwell/shared';
import type {
  PropertyRequest,
  Activity,
  Offer,
  ActivityType,
} from '@dunwell/shared';
import { dealsService } from '@/services/deals.service';
import StatusBadge from '@/components/shared/StatusBadge';
import Modal from '@/components/shared/Modal';
import api from '@/services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchResult {
  score: number;
  building: {
    id: number;
    name: string;
    availableSqm?: number | null;
    serviceCharge?: number | null;
    location?: { id: number; name: string } | null;
  };
}

type TabKey = 'detalii' | 'proprietati' | 'activitati';

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

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Core state
  const [deal, setDeal] = useState<PropertyRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('detalii');

  // Matching state (Proprietati tab)
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<number[]>([]);
  const [sending, setSending] = useState(false);

  // Activities state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);

  // Status change modal
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [lostReason, setLostReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Status dropdown
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // ----- Data fetching -----

  const fetchDeal = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await dealsService.getById(Number(id));
      setDeal(res.data);
    } catch {
      setDeal(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchMatches = useCallback(async () => {
    if (!id) return;
    setMatchesLoading(true);
    try {
      const res = await dealsService.getMatches(Number(id));
      setMatches(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMatches([]);
    } finally {
      setMatchesLoading(false);
      setMatchesLoaded(true);
    }
  }, [id]);

  const fetchActivities = useCallback(async () => {
    if (!id) return;
    setActivitiesLoading(true);
    try {
      const res = await api.get('/activities', {
        params: { requestId: id },
      });
      const body = res.data;
      setActivities(Array.isArray(body) ? body : body.data ?? []);
    } catch {
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
      setActivitiesLoaded(true);
    }
  }, [id]);

  useEffect(() => {
    fetchDeal();
  }, [fetchDeal]);

  // Lazy-load tab data
  useEffect(() => {
    if (activeTab === 'proprietati' && !matchesLoaded && deal?.dealType === DealType.REQUEST) {
      fetchMatches();
    }
    if (activeTab === 'activitati' && !activitiesLoaded) {
      fetchActivities();
    }
  }, [activeTab, matchesLoaded, activitiesLoaded, deal?.dealType, fetchMatches, fetchActivities]);

  // ----- Handlers -----

  const toggleBuilding = (buildingId: number) => {
    setSelectedBuildingIds((prev) =>
      prev.includes(buildingId)
        ? prev.filter((bid) => bid !== buildingId)
        : [...prev, buildingId],
    );
  };

  const handleSendOffers = async () => {
    if (!id || selectedBuildingIds.length === 0) return;
    setSending(true);
    try {
      await dealsService.sendOffers({
        dealId: Number(id),
        buildingIds: selectedBuildingIds,
      });
      setSelectedBuildingIds([]);
      // Refresh deal to get updated offers
      await fetchDeal();
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const res = await dealsService.downloadPdf(Number(id));
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `oferta-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      // silently fail
    }
  };

  // ----- Status change -----

  const openStatusDialog = () => {
    if (!deal) return;
    setNewStatus(deal.status);
    setLostReason('');
    setStatusError('');
    setStatusDialogOpen(true);
    setStatusDropdownOpen(false);
  };

  const handleStatusSubmit = async () => {
    if (!deal) return;
    if (newStatus === RequestStatus.LOST && !lostReason.trim()) {
      setStatusError('Motivul pierderii este obligatoriu.');
      return;
    }

    setStatusSubmitting(true);
    setStatusError('');

    try {
      await dealsService.updateStatus(deal.id, {
        status: newStatus,
        lostReason: newStatus === RequestStatus.LOST ? lostReason : undefined,
      });
      setStatusDialogOpen(false);
      fetchDeal();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Eroare la actualizare status.';
      setStatusError(message);
    } finally {
      setStatusSubmitting(false);
    }
  };

  // ----- Loading / Error states -----

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center py-24">
        <span className="inline-block w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Se incarca...</span>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="page-container">
        <button
          onClick={() => navigate('/deals')}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Inapoi la deals
        </button>
        <p className="text-sm text-slate-500">Deal-ul nu a fost gasit.</p>
      </div>
    );
  }

  // ----- Tab: Detalii -----

  const renderDetalii = () => {
    const fields: { label: string; value: React.ReactNode }[] = [
      { label: 'Nume', value: deal.name },
      { label: 'Companie', value: deal.company?.name || '-' },
      { label: 'Contact', value: deal.person?.name || '-' },
      {
        label: 'Suprafata (mp)',
        value: deal.numberOfSqm != null ? `${deal.numberOfSqm.toLocaleString('ro-RO')} mp` : '-',
      },
      {
        label: 'Fee Estimat (EUR)',
        value:
          deal.estimatedFeeValue != null
            ? `${deal.estimatedFeeValue.toLocaleString('ro-RO')} \u20AC`
            : '-',
      },
      {
        label: 'Tip Tranzactie',
        value: deal.requestType ? TYPE_LABELS[deal.requestType] ?? deal.requestType : '-',
      },
      {
        label: 'Perioada Contract',
        value: deal.contractPeriod != null ? `${deal.contractPeriod} luni` : '-',
      },
      {
        label: 'Data Start',
        value: deal.startDate
          ? new Date(deal.startDate).toLocaleDateString('ro-RO')
          : '-',
      },
      {
        label: 'Locatii',
        value:
          deal.locations && deal.locations.length > 0
            ? deal.locations.map((l) => l.name).join(', ')
            : '-',
      },
      { label: 'Notite', value: deal.notes || '-' },
    ];

    return (
      <div className="card card-body">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                {f.label}
              </p>
              <p className="text-sm text-slate-800">{f.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ----- Tab: Proprietati -----

  const renderSentOffers = (offers: Offer[] | undefined) => (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Oferte Trimise</h3>
      {(!offers || offers.length === 0) && (
        <p className="text-sm text-slate-400">Nicio oferta trimisa inca.</p>
      )}
      {offers?.map((offer) => (
        <div key={offer.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg mb-2">
          <span className="text-sm font-medium text-slate-700">{offer.offerCode}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              offer.emailStatus === 'SENT'
                ? 'bg-emerald-100 text-emerald-700'
                : offer.emailStatus === 'FAILED'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-500'
            }`}
          >
            {offer.emailStatus || 'PENDING'}
          </span>
          {offer.sentAt && (
            <span className="text-xs text-slate-400">
              {new Date(offer.sentAt).toLocaleDateString('ro-RO')}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  const renderProprietati = () => {
    const isRequest = deal.dealType === DealType.REQUEST;

    return (
      <div>
        {/* Smart matching for REQUEST deals */}
        {isRequest && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">
                Proprietati Potrivite
              </h3>
              <button
                onClick={() => {
                  setMatchesLoaded(false);
                  fetchMatches();
                }}
                disabled={matchesLoading}
                className="btn-secondary !py-1.5 !px-3 !text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${matchesLoading ? 'animate-spin' : ''}`} />
                <span>Recalculeaza</span>
              </button>
            </div>

            {matchesLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="inline-block w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                <span className="ml-2 text-sm text-slate-500">Se calculeaza potrivirile...</span>
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  Nu s-au gasit proprietati potrivite.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {matches.map((match) => (
                  <div
                    key={match.building.id}
                    className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBuildingIds.includes(match.building.id)}
                      onChange={() => toggleBuilding(match.building.id)}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {match.building.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {match.building.location?.name || '-'} |{' '}
                        {match.building.availableSqm || '-'} mp
                        {match.building.serviceCharge
                          ? ` | ${match.building.serviceCharge} EUR/mp`
                          : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-bold text-primary-600">
                        {match.score}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">match</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Send offers bar */}
            {selectedBuildingIds.length > 0 && (
              <div className="mt-4 flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg p-4">
                <span className="text-sm text-primary-700">
                  {selectedBuildingIds.length} proprietati selectate
                </span>
                <button
                  onClick={handleSendOffers}
                  disabled={sending}
                  className="btn-primary"
                >
                  {sending ? 'Se trimite...' : 'Trimite Oferta'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sent offers section */}
        {renderSentOffers(deal.offers)}
      </div>
    );
  };

  // ----- Tab: Activitati -----

  const renderActivitati = () => {
    if (activitiesLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <span className="inline-block w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <span className="ml-2 text-sm text-slate-500">Se incarca activitatile...</span>
        </div>
      );
    }

    if (activities.length === 0) {
      return (
        <div className="text-center py-8">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">
            Nicio activitate inregistrata pentru acest deal.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {activities.map((act) => (
          <div
            key={act.id}
            className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-lg"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                act.done ? 'bg-emerald-50' : 'bg-slate-50'
              }`}
            >
              <FileText
                className={`w-4 h-4 ${act.done ? 'text-emerald-500' : 'text-slate-400'}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {act.title}
                </p>
                <span className="badge text-xs bg-slate-100 text-slate-500 shrink-0">
                  {ACTIVITY_TYPE_LABELS[act.activityType as ActivityType] ?? act.activityType}
                </span>
                {act.done && (
                  <span className="badge text-xs bg-emerald-50 text-emerald-600 shrink-0">
                    Finalizat
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {new Date(act.date).toLocaleDateString('ro-RO')}
                {act.time ? ` la ${act.time}` : ''}
                {act.duration ? ` - ${act.duration} min` : ''}
              </p>
              {act.notes && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{act.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ----- Main render -----

  const dealTypeBadgeClass =
    deal.dealType === DealType.COLD_SALES
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-blue-50 text-blue-700 border-blue-200';

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'detalii', label: 'Detalii', icon: <FileText className="w-4 h-4" /> },
    { key: 'proprietati', label: 'Proprietati', icon: <Building2 className="w-4 h-4" /> },
    { key: 'activitati', label: 'Activitati', icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/deals')}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title">{deal.name}</h1>
              <StatusBadge status={deal.status} />
              <span
                className={`badge text-xs border ${dealTypeBadgeClass}`}
              >
                {DEAL_TYPE_LABELS[deal.dealType] ?? deal.dealType}
              </span>
            </div>
            {deal.company && (
              <p className="text-sm text-slate-500 mt-0.5">{deal.company.name}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="btn-secondary"
            >
              <span>Schimba Status</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {statusDropdownOpen && (
              <>
                {/* Backdrop to close dropdown */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setStatusDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setStatusDropdownOpen(false);
                        setNewStatus(s);
                        setLostReason('');
                        setStatusError('');
                        setStatusDialogOpen(true);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${
                        s === deal.status
                          ? 'text-primary-600 font-medium bg-primary-50'
                          : 'text-slate-700'
                      }`}
                    >
                      {REQUEST_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button onClick={handleDownloadPdf} className="btn-secondary">
            <FileDown className="w-4 h-4" />
            <span>Descarca PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-white rounded-lg border border-slate-200 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'detalii' && renderDetalii()}
      {activeTab === 'proprietati' && renderProprietati()}
      {activeTab === 'activitati' && renderActivitati()}

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

          <p className="text-sm text-slate-600">
            Deal: <strong>{deal.name}</strong>
          </p>

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
