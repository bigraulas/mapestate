import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileDown,
  RefreshCw,
  Building2,
  Calendar,
  ChevronDown,
  Eye,
  Mail,
  MessageCircle,
  MapPin,
  Ruler,
  Clock,
  Truck,
  Check,
  X,
  ChevronUp,
  FileText,
  UserPlus,
  Pencil,
} from 'lucide-react';
import {
  RequestStatus,
  REQUEST_STATUS_LABELS,
  DealType,
  DEAL_TYPE_LABELS,
  ACTIVITY_TYPE_LABELS,
} from '@mapestate/shared';
import type {
  PropertyRequest,
  Activity,
  Offer,
  ActivityType,
} from '@mapestate/shared';
import { dealsService } from '@/services/deals.service';
import { usersService } from '@/services/users.service';
import { companiesService } from '@/services/companies.service';
import { personsService } from '@/services/persons.service';
import { useAuth } from '@/hooks/useAuth';
import StatusBadge from '@/components/shared/StatusBadge';
import Modal from '@/components/shared/Modal';
import api from '@/services/api';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchResult {
  score: number;
  building: {
    id: number;
    name: string;
    address?: string | null;
    availableSqm?: number | null;
    serviceCharge?: number | null;
    rentPrice?: number | null;
    clearHeight?: number | null;
    availableFrom?: string | null;
    location?: { id: number; name: string } | null;
    unitsCount?: number;
    totalDocks?: number;
  };
  breakdown?: {
    sqm: number;
    location: number;
    height: number;
    availability: number;
  };
}

interface BuildingOverride {
  buildingId: number;
  rentPrice: string;
  serviceCharge: string;
}

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

  // Matching state
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Activities
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [showSystemEvents, setShowSystemEvents] = useState(true);

  // UI state
  const [showDetails, setShowDetails] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [showSentOffers, setShowSentOffers] = useState(false);

  // Status change modal
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [lostReason, setLostReason] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Admin reassignment
  const { isAdmin } = useAuth();
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignUserId, setReassignUserId] = useState<number | ''>('');
  const [reassignSubmitting, setReassignSubmitting] = useState(false);
  const [brokersList, setBrokersList] = useState<{id: number; firstName: string; lastName: string}[]>([]);

  // Pre-send modal
  const [preSendOpen, setPreSendOpen] = useState(false);
  const [preSendAction, setPreSendAction] = useState<'email' | 'pdf' | 'preview' | 'whatsapp'>('email');
  const [buildingOverrides, setBuildingOverrides] = useState<BuildingOverride[]>([]);
  const [offerMessage, setOfferMessage] = useState('');

  // Closure (WON) modal
  const [closureOpen, setClosureOpen] = useState(false);
  const [closureSubmitting, setClosureSubmitting] = useState(false);
  const [closureError, setClosureError] = useState('');
  const [closureForm, setClosureForm] = useState({
    agreedPrice: '',
    actualFee: '',
    signedDate: '',
    contractStartDate: '',
    contractEndDate: '',
    wonBuildingId: '' as string,
    wonUnitIds: '' as string,
    closureNotes: '',
  });

  // Edit deal
  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    requestType: 'RENT' as string,
    companyId: '' as string,
    personId: '' as string,
    numberOfSqm: '' as string,
    minHeight: '' as string,
    estimatedFeeValue: '' as string,
    contractPeriod: '' as string,
    startDate: '' as string,
    notes: '' as string,
  });
  const [editCompanies, setEditCompanies] = useState<{id: number; name: string}[]>([]);
  const [editPersons, setEditPersons] = useState<{id: number; name: string; companyId?: number | null}[]>([]);

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
    try {
      const res = await api.get('/activities', { params: { requestId: id } });
      const body = res.data;
      setActivities(Array.isArray(body) ? body : body.data ?? []);
    } catch {
      setActivities([]);
    } finally {
      setActivitiesLoaded(true);
    }
  }, [id]);

  useEffect(() => {
    fetchDeal();
  }, [fetchDeal]);

  // Auto-load matches for REQUEST deals
  useEffect(() => {
    if (deal && deal.dealType === DealType.REQUEST && !matchesLoaded) {
      fetchMatches();
    }
  }, [deal, matchesLoaded, fetchMatches]);

  // Lazy-load activities on expand
  useEffect(() => {
    if (showActivities && !activitiesLoaded) {
      fetchActivities();
    }
  }, [showActivities, activitiesLoaded, fetchActivities]);

  // Fetch brokers when reassign modal opens
  useEffect(() => {
    if (!reassignOpen || brokersList.length > 0) return;
    const fetchBrokers = async () => {
      try {
        const res = await usersService.getAll(1, 100);
        setBrokersList(res.data.data ?? []);
      } catch {}
    };
    fetchBrokers();
  }, [reassignOpen, brokersList.length]);

  // Load companies/persons + pre-fill form when edit modal opens
  useEffect(() => {
    if (!editOpen || !deal) return;
    setEditForm({
      name: deal.name || '',
      requestType: deal.requestType || 'RENT',
      companyId: deal.company?.id ? String(deal.company.id) : '',
      personId: deal.person?.id ? String(deal.person.id) : '',
      numberOfSqm: deal.numberOfSqm != null ? String(deal.numberOfSqm) : '',
      minHeight: (deal as any).minHeight != null ? String((deal as any).minHeight) : '',
      estimatedFeeValue: deal.estimatedFeeValue != null ? String(deal.estimatedFeeValue) : '',
      contractPeriod: deal.contractPeriod != null ? String(deal.contractPeriod) : '',
      startDate: deal.startDate ? new Date(deal.startDate).toISOString().split('T')[0] : '',
      notes: deal.notes || '',
    });
    setEditError('');
    const loadLists = async () => {
      try {
        const [compRes, persRes] = await Promise.all([
          companiesService.getAll({ page: 1, limit: 500 }),
          personsService.getAll({ page: 1, limit: 500 }),
        ]);
        setEditCompanies(compRes.data?.data || compRes.data || []);
        setEditPersons(persRes.data?.data || persRes.data || []);
      } catch {}
    };
    if (editCompanies.length === 0) loadLists();
  }, [editOpen, deal]);

  const handleEditSubmit = async () => {
    if (!deal) return;
    if (!editForm.companyId) { setEditError('Selecteaza un client.'); return; }
    if (!editForm.personId) { setEditError('Selecteaza o persoana de contact.'); return; }
    setEditSubmitting(true);
    setEditError('');
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        requestType: editForm.requestType,
        companyId: Number(editForm.companyId),
        personId: Number(editForm.personId),
      };
      if (editForm.numberOfSqm) payload.numberOfSqm = Number(editForm.numberOfSqm);
      if (editForm.minHeight) payload.minHeight = Number(editForm.minHeight);
      if (editForm.estimatedFeeValue) payload.estimatedFeeValue = Number(editForm.estimatedFeeValue);
      if (editForm.contractPeriod) payload.contractPeriod = Number(editForm.contractPeriod);
      if (editForm.startDate) payload.startDate = editForm.startDate;
      payload.notes = editForm.notes;

      await dealsService.update(deal.id, payload);
      setEditOpen(false);
      toast.success('Cerere actualizata!');
      fetchDeal();
      setMatchesLoaded(false); // re-trigger matches
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'Eroare la salvare.';
      setEditError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const editFilteredPersons = editForm.companyId
    ? editPersons.filter((p) => p.companyId === Number(editForm.companyId))
    : editPersons;

  // ----- Pre-send modal helpers -----

  const openPreSend = (action: 'email' | 'pdf' | 'preview' | 'whatsapp') => {
    // Initialize overrides from selected buildings' current prices
    const overrides = selectedBuildingIds.map((bid) => {
      const match = matches.find((m) => m.building.id === bid);
      return {
        buildingId: bid,
        rentPrice: match?.building.rentPrice != null ? String(match.building.rentPrice) : '',
        serviceCharge: match?.building.serviceCharge != null ? String(match.building.serviceCharge) : '',
      };
    });
    setBuildingOverrides(overrides);
    setOfferMessage('');
    setPreSendAction(action);
    setPreSendOpen(true);
  };

  const getOverridesPayload = () => {
    return buildingOverrides
      .filter((o) => o.rentPrice !== '' || o.serviceCharge !== '')
      .map((o) => ({
        buildingId: o.buildingId,
        ...(o.rentPrice !== '' ? { rentPrice: Number(o.rentPrice) } : {}),
        ...(o.serviceCharge !== '' ? { serviceCharge: Number(o.serviceCharge) } : {}),
      }));
  };

  const handlePreSendConfirm = async () => {
    const overrides = getOverridesPayload();
    setPreSendOpen(false);

    if (preSendAction === 'email') {
      if (!id || selectedBuildingIds.length === 0) return;
      setSending(true);
      try {
        await dealsService.sendOffers({
          dealId: Number(id),
          buildingIds: selectedBuildingIds,
          message: offerMessage || undefined,
          buildingOverrides: overrides.length > 0 ? overrides : undefined,
        });
        toast.success('Email trimis cu succes!');
        setSelectedBuildingIds([]);
        await fetchDeal();
      } catch {
        toast.error('Eroare la trimiterea email-ului.');
      } finally {
        setSending(false);
      }
    } else if (preSendAction === 'preview') {
      if (!id || selectedBuildingIds.length === 0) return;
      setPdfLoading(true);
      toast('Se genereaza preview...', { icon: '👁️' });
      try {
        const res = await dealsService.generatePdfWithOverrides(
          Number(id),
          selectedBuildingIds,
          overrides.length > 0 ? overrides : undefined,
        );
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch {
        toast.error('Eroare la generarea PDF-ului.');
      } finally {
        setPdfLoading(false);
      }
    } else if (preSendAction === 'pdf') {
      if (!id || selectedBuildingIds.length === 0) return;
      setPdfLoading(true);
      toast('Se genereaza PDF-ul...', { icon: '📄' });
      try {
        const res = await dealsService.generatePdfWithOverrides(
          Number(id),
          selectedBuildingIds,
          overrides.length > 0 ? overrides : undefined,
        );
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `oferta-${id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('PDF descarcat!');
      } catch {
        toast.error('Eroare la generarea PDF-ului.');
      } finally {
        setPdfLoading(false);
      }
    } else if (preSendAction === 'whatsapp') {
      if (!id || selectedBuildingIds.length === 0) return;
      setPdfLoading(true);
      toast('Se pregateste link-ul PDF...', { icon: '💬' });
      try {
        const res = await dealsService.createPdfLink(
          Number(id),
          selectedBuildingIds,
          overrides.length > 0 ? overrides : undefined,
        );
        const token = res.data.token;
        const pdfUrl = `${window.location.origin}/api/offers/pdf/shared/${token}`;

        const phones = (deal?.person as any)?.phones;
        const phone = Array.isArray(phones) && phones.length > 0 ? phones[0] : '';
        const cleanPhone = phone.replace(/[^0-9+]/g, '').replace(/^\+/, '');

        const message = encodeURIComponent(
          `Buna ziua, va trimit oferta pentru ${deal?.name || 'proprietati'}.\n\nPuteti descarca prezentarea aici:\n${pdfUrl}`,
        );

        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
      } catch {
        toast.error('Eroare la generarea link-ului.');
      } finally {
        setPdfLoading(false);
      }
    }
  };

  // ----- Handlers -----

  const toggleBuilding = (buildingId: number) => {
    setSelectedBuildingIds((prev) =>
      prev.includes(buildingId)
        ? prev.filter((bid) => bid !== buildingId)
        : [...prev, buildingId],
    );
  };

  const selectAll = () => {
    setSelectedBuildingIds(matches.map((m) => m.building.id));
  };

  const deselectAll = () => {
    setSelectedBuildingIds([]);
  };

  const handleReassign = async () => {
    if (!deal || !reassignUserId) return;
    setReassignSubmitting(true);
    try {
      await dealsService.reassign(deal.id, Number(reassignUserId));
      setReassignOpen(false);
      toast.success('Deal reasignat cu succes!');
      fetchDeal();
    } catch {
      toast.error('Eroare la reasignare.');
    } finally {
      setReassignSubmitting(false);
    }
  };

  const handleClosureSubmit = async () => {
    if (!deal) return;
    if (!closureForm.agreedPrice || !closureForm.actualFee || !closureForm.signedDate || !closureForm.contractStartDate || !closureForm.wonBuildingId) {
      setClosureError('Completeaza campurile obligatorii.');
      return;
    }
    setClosureSubmitting(true);
    setClosureError('');
    try {
      const unitIdsArr = closureForm.wonUnitIds
        ? closureForm.wonUnitIds.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))
        : [];
      await dealsService.closeDeal(deal.id, {
        agreedPrice: Number(closureForm.agreedPrice),
        actualFee: Number(closureForm.actualFee),
        signedDate: closureForm.signedDate,
        contractStartDate: closureForm.contractStartDate,
        contractEndDate: closureForm.contractEndDate || undefined,
        wonBuildingId: Number(closureForm.wonBuildingId),
        wonUnitIds: unitIdsArr,
        closureNotes: closureForm.closureNotes || undefined,
      });
      setClosureOpen(false);
      toast.success('Deal marcat ca CASTIGAT!');
      fetchDeal();
    } catch (err: unknown) {
      const message = (err as any)?.response?.data?.message || 'Eroare la finalizare.';
      setClosureError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setClosureSubmitting(false);
    }
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
        holdReason: newStatus === RequestStatus.ON_HOLD ? holdReason : undefined,
      } as any);
      setStatusDialogOpen(false);
      toast.success('Status actualizat!');
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
      <div className="flex items-center justify-center py-24">
        <span className="inline-block w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Se incarca...</span>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-4">
        <button
          onClick={() => navigate('/deals')}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Inapoi
        </button>
        <p className="text-sm text-slate-500">Deal-ul nu a fost gasit.</p>
      </div>
    );
  }

  const isRequest = deal.dealType === DealType.REQUEST;
  const selectedCount = selectedBuildingIds.length;
  const allSelected = matches.length > 0 && selectedCount === matches.length;

  // Score color helper
  const getScoreStyle = (score: number) => {
    if (score >= 70) return 'bg-emerald-500 text-white';
    if (score >= 50) return 'bg-amber-500 text-white';
    return 'bg-slate-400 text-white';
  };

  // ----- Render -----

  return (
    <div className="pb-32">
      {/* ── HEADER ── compact, mobile-friendly */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/deals')}
            className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-600 active:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-slate-900 truncate">
                {deal.name}
              </h1>
              <StatusBadge status={deal.status} />
            </div>
            <p className="text-xs text-slate-500 truncate">
              {deal.company?.name || '-'}
              {deal.person ? ` · ${deal.person.name}` : ''}
            </p>
            {isAdmin && deal.user && (
              <span className="text-xs text-primary-600">
                Broker: {deal.user.firstName} {deal.user.lastName}
              </span>
            )}
          </div>
          {/* Edit deal button */}
          <button
            onClick={() => setEditOpen(true)}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 active:bg-slate-100"
            title="Editeaza cererea"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {/* Reassign button (admin only) */}
          {isAdmin && (
            <button
              onClick={() => { setReassignUserId(''); setReassignOpen(true); }}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 active:bg-slate-100"
              title="Reasigneaza"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}
          {/* Status change button */}
          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 active:bg-slate-100"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            {statusDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setStatusDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 max-h-72 overflow-y-auto">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        if (s === RequestStatus.WON) {
                          setStatusDropdownOpen(false);
                          setClosureError('');
                          setClosureOpen(true);
                          return;
                        }
                        setStatusDropdownOpen(false);
                        setNewStatus(s);
                        setLostReason('');
                        setHoldReason('');
                        setStatusError('');
                        setStatusDialogOpen(true);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm active:bg-slate-100 transition-colors ${
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
        </div>
      </div>

      {/* ── CRITERIA BAR ── horizontal scroll, always visible */}
      {isRequest && (
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {deal.numberOfSqm != null && (
              <span className="inline-flex items-center gap-1 text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-700">
                <Ruler className="w-3 h-3 text-blue-500" />
                {deal.numberOfSqm.toLocaleString('ro-RO')} mp
              </span>
            )}
            {deal.locations && deal.locations.length > 0 && deal.locations.map((l) => (
              <span key={l.id} className="inline-flex items-center gap-1 text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-700">
                <MapPin className="w-3 h-3 text-emerald-500" />
                {l.name}
              </span>
            ))}
            {(deal as any).searchRadius != null && (deal as any).searchRadius > 0 && (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 font-medium text-blue-700">
                <MapPin className="w-3 h-3" />
                Raza {(deal as any).searchRadius} km
              </span>
            )}
            {(deal as any).minHeight != null && (
              <span className="inline-flex items-center gap-1 text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-700">
                <Building2 className="w-3 h-3 text-violet-500" />
                min {(deal as any).minHeight}m
              </span>
            )}
            {deal.startDate && (
              <span className="inline-flex items-center gap-1 text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-700">
                <Clock className="w-3 h-3 text-teal-500" />
                {new Date(deal.startDate).toLocaleDateString('ro-RO')}
              </span>
            )}
            {deal.requestType && (
              <span className="inline-flex items-center gap-1 text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500">
                {TYPE_LABELS[deal.requestType] ?? deal.requestType}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── MATCHES SECTION ── main content, auto-loaded */}
      {isRequest && (
        <div className="px-4 pt-4">
          {/* Section header with select all */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-700">
                Proprietati potrivite
              </h2>
              {matchesLoaded && !matchesLoading && (
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {matches.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {matches.length > 0 && (
                <button
                  onClick={allSelected ? deselectAll : selectAll}
                  className="text-xs text-primary-600 font-medium px-2 py-1 rounded hover:bg-primary-50 active:bg-primary-100 transition-colors"
                >
                  {allSelected ? 'Deselecteaza' : 'Selecteaza tot'}
                </button>
              )}
              <button
                onClick={() => {
                  setMatchesLoaded(false);
                  fetchMatches();
                }}
                disabled={matchesLoading}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 active:bg-slate-100 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${matchesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Loading */}
          {matchesLoading && (
            <div className="flex items-center justify-center py-12">
              <span className="inline-block w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              <span className="ml-2 text-sm text-slate-500">Se calculeaza...</span>
            </div>
          )}

          {/* Empty */}
          {!matchesLoading && matchesLoaded && matches.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Nu s-au gasit proprietati potrivite.</p>
            </div>
          )}

          {/* Match cards - tap entire card to toggle */}
          {!matchesLoading && matches.length > 0 && (
            <div className="space-y-2">
              {matches.map((match) => {
                const selected = selectedBuildingIds.includes(match.building.id);
                return (
                  <div
                    key={match.building.id}
                    onClick={() => toggleBuilding(match.building.id)}
                    className={`relative p-3 rounded-xl border-2 transition-all cursor-pointer active:scale-[0.98] ${
                      selected
                        ? 'border-primary-400 bg-primary-50/50'
                        : 'border-slate-200 bg-white active:bg-slate-50'
                    }`}
                  >
                    {/* Selection indicator */}
                    <div
                      className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        selected
                          ? 'bg-primary-600'
                          : 'border-2 border-slate-300'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>

                    {/* Score + Name row */}
                    <div className="flex items-start gap-2.5 pr-8">
                      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${getScoreStyle(match.score)}`}>
                        {match.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 leading-tight">
                          {match.building.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {match.building.location?.name}
                          {match.building.address ? ` · ${match.building.address}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Spec pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5 ml-[50px]">
                      {match.building.availableSqm != null && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium">
                          <Ruler className="w-3 h-3" />
                          {match.building.availableSqm.toLocaleString('ro-RO')} mp
                        </span>
                      )}
                      {match.building.clearHeight != null && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-violet-50 text-violet-700 px-2 py-1 rounded-md font-medium">
                          {match.building.clearHeight}m
                        </span>
                      )}
                      {match.building.availableFrom && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-teal-50 text-teal-700 px-2 py-1 rounded-md font-medium">
                          <Clock className="w-3 h-3" />
                          {new Date(match.building.availableFrom).toLocaleDateString('ro-RO')}
                        </span>
                      )}
                      {(match.building.totalDocks ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">
                          <Truck className="w-3 h-3" />
                          {match.building.totalDocks} docks
                        </span>
                      )}
                      {match.building.rentPrice != null && match.building.rentPrice > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 px-2 py-1 rounded-md font-medium">
                          {match.building.rentPrice} €/mp
                        </span>
                      )}
                      {match.building.serviceCharge != null && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                          {match.building.serviceCharge} €/mp SC
                        </span>
                      )}
                    </div>

                    {/* Mini breakdown bar */}
                    {match.breakdown && (
                      <div className="mt-2.5 ml-[50px] flex items-center gap-0.5 h-1.5 rounded-full overflow-hidden bg-slate-100">
                        <div className="h-full bg-blue-400 rounded-l-full" style={{ width: `${match.breakdown.sqm * 0.4}%` }} title={`Suprafata: ${match.breakdown.sqm}`} />
                        <div className="h-full bg-emerald-400" style={{ width: `${match.breakdown.location * 0.4}%` }} title={`Zona: ${match.breakdown.location}`} />
                        <div className="h-full bg-violet-400 rounded-r-full" style={{ width: `${match.breakdown.height * 0.2}%` }} title={`Inaltime: ${match.breakdown.height}`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── COLLAPSIBLE SECTIONS ── */}
      <div className="px-4 mt-6 space-y-2">
        {/* Sent Offers */}
        {deal.offers && deal.offers.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setShowSentOffers(!showSentOffers)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                Oferte trimise
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {deal.offers.length}
                </span>
              </span>
              {showSentOffers ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showSentOffers && (
              <div className="px-4 pb-3 space-y-2">
                {deal.offers.map((offer: Offer) => (
                  <div key={offer.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-xs font-mono text-slate-600">{offer.offerCode}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        offer.emailStatus === 'SENT'
                          ? 'bg-emerald-100 text-emerald-700'
                          : offer.emailStatus === 'FAILED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {offer.emailStatus || 'PENDING'}
                    </span>
                    {offer.sentAt && (
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {new Date(offer.sentAt).toLocaleDateString('ro-RO')}
                      </span>
                    )}
                    <select
                      className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-600 ml-2"
                      value={(offer as any).feedback || 'SENT'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={async (e) => {
                        try {
                          await dealsService.updateOfferFeedback(offer.id, e.target.value);
                          fetchDeal();
                        } catch {}
                      }}
                    >
                      <option value="SENT">Trimisa</option>
                      <option value="VIEWED">Vizualizata</option>
                      <option value="INTERESTED">Interesat</option>
                      <option value="REJECTED">Respinsa</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Deal Details */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Detalii deal
            </span>
            {showDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showDetails && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Companie', value: deal.company?.name },
                  { label: 'Contact', value: deal.person?.name },
                  { label: 'Suprafata', value: deal.numberOfSqm ? `${deal.numberOfSqm.toLocaleString('ro-RO')} mp` : null },
                  { label: 'Inaltime min.', value: (deal as any).minHeight ? `${(deal as any).minHeight}m` : null },
                  { label: 'Fee estimat', value: deal.estimatedFeeValue ? `${deal.estimatedFeeValue.toLocaleString('ro-RO')} €` : null },
                  { label: 'Tip', value: deal.requestType ? TYPE_LABELS[deal.requestType] ?? deal.requestType : null },
                  { label: 'Contract', value: deal.contractPeriod ? `${deal.contractPeriod} luni` : null },
                  { label: 'Data start', value: deal.startDate ? new Date(deal.startDate).toLocaleDateString('ro-RO') : null },
                  { label: 'Locatii', value: deal.locations?.length ? deal.locations.map((l) => l.name).join(', ') : null },
                  { label: 'Zona harta', value: (deal as any).searchRadius ? `Raza ${(deal as any).searchRadius} km` : null },
                  { label: 'Tip deal', value: DEAL_TYPE_LABELS[deal.dealType] ?? deal.dealType },
                  { label: 'Sursa', value: deal.source ?? null },
                ].filter(f => f.value).map((f) => (
                  <div key={f.label}>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{f.label}</p>
                    <p className="text-sm text-slate-800 mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>
              {deal.notes && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Notite</p>
                  <p className="text-sm text-slate-600">{deal.notes}</p>
                </div>
              )}
              {deal.status === 'LOST' && deal.lostReason && (
                <div className="mt-3 pt-3 border-t border-red-100">
                  <p className="text-[10px] font-medium text-red-400 uppercase tracking-wider mb-1">Motiv pierdere</p>
                  <p className="text-sm text-red-600">{deal.lostReason}</p>
                </div>
              )}
              {deal.status === 'ON_HOLD' && (deal as any).holdReason && (
                <div className="mt-3 pt-3 border-t border-amber-100">
                  <p className="text-[10px] font-medium text-amber-400 uppercase tracking-wider mb-1">Motiv suspendare</p>
                  <p className="text-sm text-amber-600">{(deal as any).holdReason}</p>
                </div>
              )}
              {deal.status === 'WON' && (deal as any).agreedPrice && (
                <div className="mt-3 pt-3 border-t border-emerald-100">
                  <p className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider mb-2">Date finalizare</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Pret agreat', value: `${(deal as any).agreedPrice?.toLocaleString('ro-RO')} €` },
                      { label: 'Comision', value: `${(deal as any).actualFee?.toLocaleString('ro-RO')} €` },
                      { label: 'Data semnare', value: (deal as any).signedDate ? new Date((deal as any).signedDate).toLocaleDateString('ro-RO') : null },
                      { label: 'Start contract', value: (deal as any).contractStartDate ? new Date((deal as any).contractStartDate).toLocaleDateString('ro-RO') : null },
                      { label: 'Sfarsit contract', value: (deal as any).contractEndDate ? new Date((deal as any).contractEndDate).toLocaleDateString('ro-RO') : null },
                    ].filter(f => f.value).map((f) => (
                      <div key={f.label}>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{f.label}</p>
                        <p className="text-sm text-slate-800 mt-0.5">{f.value}</p>
                      </div>
                    ))}
                  </div>
                  {(deal as any).closureNotes && (
                    <div className="mt-2">
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Notite</p>
                      <p className="text-sm text-slate-600 mt-0.5">{(deal as any).closureNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activities */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <button
            onClick={() => setShowActivities(!showActivities)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Activitati
              {activitiesLoaded && activities.length > 0 && (
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {activities.length}
                </span>
              )}
              {activitiesLoaded && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSystemEvents(!showSystemEvents); }}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    showSystemEvents
                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
                >
                  Sistem
                </button>
              )}
            </span>
            {showActivities ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showActivities && (
            <div className="px-4 pb-3">
              {!activitiesLoaded ? (
                <div className="flex items-center justify-center py-6">
                  <span className="inline-block w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                </div>
              ) : activities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Nicio activitate.</p>
              ) : (() => {
                const filteredActivities = showSystemEvents
                  ? activities
                  : activities.filter((a) => !(a as any).isSystem);
                return (
                  <div className="space-y-2">
                    {filteredActivities.map((act) => {
                      const isSystemAct = (act as any).isSystem;
                      return (
                        <div key={act.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg ${isSystemAct ? 'bg-blue-50/50' : 'bg-slate-50'}`}>
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                            isSystemAct ? 'bg-blue-100' : act.done ? 'bg-emerald-100' : 'bg-slate-200'
                          }`}>
                            {isSystemAct
                              ? <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                              : act.done
                                ? <Check className="w-3.5 h-3.5 text-emerald-600" />
                                : <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm text-slate-700 font-medium truncate">{act.title}</p>
                              {isSystemAct && (
                                <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium shrink-0">auto</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {ACTIVITY_TYPE_LABELS[act.activityType as ActivityType] ?? act.activityType}
                              {' · '}
                              {new Date(act.date).toLocaleDateString('ro-RO')}
                              {act.time ? ` ${act.time}` : ''}
                            </p>
                            {act.notes && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{act.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ── STICKY BOTTOM ACTION BAR ── always visible when selections exist */}
      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg safe-bottom">
          <div className="px-4 py-3">
            {/* Selection count + deselect */}
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-semibold text-slate-700">
                {selectedCount} {selectedCount === 1 ? 'proprietate' : 'proprietati'}
              </span>
              <button
                onClick={deselectAll}
                className="text-xs text-slate-500 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 active:bg-slate-200"
              >
                <X className="w-3 h-3" />
                Anuleaza
              </button>
            </div>
            {/* Action buttons - 2x2 grid on mobile, row on desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => openPreSend('preview')}
                disabled={pdfLoading}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 active:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </button>
              <button
                onClick={() => openPreSend('pdf')}
                disabled={pdfLoading}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 active:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <FileDown className="w-4 h-4" />
                <span>PDF</span>
              </button>
              <button
                onClick={() => openPreSend('whatsapp')}
                disabled={pdfLoading}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-green-500 text-sm font-medium text-white active:bg-green-600 disabled:opacity-50 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => openPreSend('email')}
                disabled={sending}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-primary-600 text-sm font-medium text-white active:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>{sending ? 'Se trimite...' : 'Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRE-SEND MODAL ── */}
      <Modal
        isOpen={preSendOpen}
        onClose={() => setPreSendOpen(false)}
        title="Personalizeaza oferta"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Verifica si modifica preturile inainte de a trimite oferta.
          </p>

          {/* Building overrides list */}
          <div className="space-y-3">
            {buildingOverrides.map((override, idx) => {
              const match = matches.find((m) => m.building.id === override.buildingId);
              if (!match) return null;
              return (
                <div key={override.buildingId} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-start gap-2 mb-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 leading-tight">
                        {match.building.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {match.building.location?.name}
                        {match.building.availableSqm ? ` · ${match.building.availableSqm.toLocaleString('ro-RO')} mp` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        Chirie (EUR/mp/luna)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={override.rentPrice}
                        onChange={(e) => {
                          const updated = [...buildingOverrides];
                          updated[idx] = { ...updated[idx], rentPrice: e.target.value };
                          setBuildingOverrides(updated);
                        }}
                        className="input mt-0.5"
                        placeholder="Pret chirie"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        Service charge (EUR/mp/luna)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={override.serviceCharge}
                        onChange={(e) => {
                          const updated = [...buildingOverrides];
                          updated[idx] = { ...updated[idx], serviceCharge: e.target.value };
                          setBuildingOverrides(updated);
                        }}
                        className="input mt-0.5"
                        placeholder="Service charge"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom message (for email) */}
          {preSendAction === 'email' && (
            <div>
              <label htmlFor="offer-message" className="label">Mesaj personalizat (optional)</label>
              <textarea
                id="offer-message"
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                className="input"
                rows={2}
                placeholder="Adauga un mesaj in email..."
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={() => setPreSendOpen(false)} className="btn-secondary">
              Anuleaza
            </button>
            <button
              onClick={handlePreSendConfirm}
              disabled={sending || pdfLoading}
              className={`btn-primary ${preSendAction === 'whatsapp' ? '!bg-green-500 hover:!bg-green-600' : ''}`}
            >
              {(sending || pdfLoading) && (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>
                {preSendAction === 'email' ? (sending ? 'Se trimite...' : 'Trimite email')
                  : preSendAction === 'preview' ? 'Deschide preview'
                  : preSendAction === 'pdf' ? 'Descarca PDF'
                  : 'Trimite WhatsApp'}
              </span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ── STATUS CHANGE MODAL ── */}
      <Modal
        isOpen={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        title="Schimba statusul"
      >
        <div className="space-y-4">
          {statusError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {statusError}
            </div>
          )}

          <div>
            <label htmlFor="new-status" className="label">Status nou</label>
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
              <label htmlFor="lost-reason" className="label">Motivul pierderii *</label>
              <textarea
                id="lost-reason"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="input"
                rows={3}
                placeholder="Descrie motivul..."
                required
              />
            </div>
          )}

          {newStatus === RequestStatus.ON_HOLD && (
            <div>
              <label htmlFor="hold-reason" className="label">Motivul suspendarii</label>
              <textarea
                id="hold-reason"
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                className="input"
                rows={2}
                placeholder="De ce se pune on hold..."
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={() => setStatusDialogOpen(false)} className="btn-secondary">
              Anuleaza
            </button>
            <button onClick={handleStatusSubmit} disabled={statusSubmitting} className="btn-primary">
              {statusSubmitting && (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{statusSubmitting ? 'Se salveaza...' : 'Salveaza'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ── REASSIGN MODAL ── */}
      <Modal
        isOpen={reassignOpen}
        onClose={() => setReassignOpen(false)}
        title="Reasigneaza deal-ul"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Selecteaza broker-ul caruia doresti sa ii atribuiti deal-ul <strong>{deal?.name}</strong>.
          </p>
          <div>
            <label htmlFor="reassign-broker" className="label">Broker nou</label>
            <select
              id="reassign-broker"
              value={reassignUserId}
              onChange={(e) => setReassignUserId(e.target.value ? Number(e.target.value) : '')}
              className="input"
            >
              <option value="">Selecteaza un broker...</option>
              {brokersList.map((b) => (
                <option key={b.id} value={b.id}>{b.firstName} {b.lastName}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={() => setReassignOpen(false)} className="btn-secondary">Anuleaza</button>
            <button onClick={handleReassign} disabled={reassignSubmitting || !reassignUserId} className="btn-primary">
              {reassignSubmitting && <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{reassignSubmitting ? 'Se salveaza...' : 'Reasigneaza'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ── EDIT DEAL MODAL ── */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editeaza cererea"
      >
        <div className="space-y-4">
          {editError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {editError}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="edit-name" className="label">Nume deal</label>
            <input
              id="edit-name"
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              className="input"
            />
          </div>

          {/* Request type toggle */}
          <div className="flex items-center gap-3">
            <label className="label mb-0 text-slate-500">Tip:</label>
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setEditForm((f) => ({ ...f, requestType: 'RENT' }))}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  editForm.requestType === 'RENT'
                    ? 'bg-white text-slate-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Inchiriere
              </button>
              <button
                type="button"
                onClick={() => setEditForm((f) => ({ ...f, requestType: 'SALE' }))}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  editForm.requestType === 'SALE'
                    ? 'bg-white text-slate-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Achizitie
              </button>
            </div>
          </div>

          {/* Company */}
          <div>
            <label htmlFor="edit-company" className="label">
              Client <span className="text-red-400">*</span>
            </label>
            <select
              id="edit-company"
              value={editForm.companyId}
              onChange={(e) => setEditForm((f) => ({ ...f, companyId: e.target.value, personId: '' }))}
              className="input"
            >
              <option value="">-- Selecteaza --</option>
              {editCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Person */}
          <div>
            <label htmlFor="edit-person" className="label">
              Persoana contact <span className="text-red-400">*</span>
            </label>
            <select
              id="edit-person"
              value={editForm.personId}
              onChange={(e) => setEditForm((f) => ({ ...f, personId: e.target.value }))}
              className="input"
            >
              <option value="">-- Selecteaza --</option>
              {editFilteredPersons.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Criteria */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Criterii</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-sqm" className="label">Suprafata (mp)</label>
                <input
                  id="edit-sqm"
                  type="number"
                  value={editForm.numberOfSqm}
                  onChange={(e) => setEditForm((f) => ({ ...f, numberOfSqm: e.target.value }))}
                  className="input"
                  min={0}
                />
              </div>
              <div>
                <label htmlFor="edit-height" className="label">Inaltime min. (m)</label>
                <input
                  id="edit-height"
                  type="number"
                  value={editForm.minHeight}
                  onChange={(e) => setEditForm((f) => ({ ...f, minHeight: e.target.value }))}
                  className="input"
                  min={0}
                  step="0.1"
                />
              </div>
              <div>
                <label htmlFor="edit-fee" className="label">Fee estimat (EUR)</label>
                <input
                  id="edit-fee"
                  type="number"
                  value={editForm.estimatedFeeValue}
                  onChange={(e) => setEditForm((f) => ({ ...f, estimatedFeeValue: e.target.value }))}
                  className="input"
                  min={0}
                />
              </div>
              <div>
                <label htmlFor="edit-contract" className="label">Perioada contract (luni)</label>
                <input
                  id="edit-contract"
                  type="number"
                  value={editForm.contractPeriod}
                  onChange={(e) => setEditForm((f) => ({ ...f, contractPeriod: e.target.value }))}
                  className="input"
                  min={0}
                />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="edit-start" className="label">Data start</label>
              <input
                id="edit-start"
                type="date"
                value={editForm.startDate}
                onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
                className="input"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="edit-notes" className="label">Notite</label>
            <textarea
              id="edit-notes"
              value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              className="input"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={() => setEditOpen(false)} className="btn-secondary">
              Anuleaza
            </button>
            <button onClick={handleEditSubmit} disabled={editSubmitting} className="btn-primary">
              {editSubmitting && (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{editSubmitting ? 'Se salveaza...' : 'Salveaza'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ── CLOSURE (WON) MODAL ── */}
      <Modal
        isOpen={closureOpen}
        onClose={() => setClosureOpen(false)}
        title="Finalizeaza deal-ul (WON)"
      >
        <div className="space-y-4">
          {closureError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {closureError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Pret agreat (EUR) *</label>
              <input
                type="number"
                value={closureForm.agreedPrice}
                onChange={(e) => setClosureForm((f) => ({ ...f, agreedPrice: e.target.value }))}
                className="input"
                min={0}
              />
            </div>
            <div>
              <label className="label">Comision real (EUR) *</label>
              <input
                type="number"
                value={closureForm.actualFee}
                onChange={(e) => setClosureForm((f) => ({ ...f, actualFee: e.target.value }))}
                className="input"
                min={0}
              />
            </div>
            <div>
              <label className="label">Data semnare *</label>
              <input
                type="date"
                value={closureForm.signedDate}
                onChange={(e) => setClosureForm((f) => ({ ...f, signedDate: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">Data start contract *</label>
              <input
                type="date"
                value={closureForm.contractStartDate}
                onChange={(e) => setClosureForm((f) => ({ ...f, contractStartDate: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">Data sfarsit contract</label>
              <input
                type="date"
                value={closureForm.contractEndDate}
                onChange={(e) => setClosureForm((f) => ({ ...f, contractEndDate: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">Building ID castigat *</label>
              <input
                type="number"
                value={closureForm.wonBuildingId}
                onChange={(e) => setClosureForm((f) => ({ ...f, wonBuildingId: e.target.value }))}
                className="input"
                placeholder="ID-ul building-ului"
              />
            </div>
          </div>

          <div>
            <label className="label">Unit IDs (separate prin virgula)</label>
            <input
              type="text"
              value={closureForm.wonUnitIds}
              onChange={(e) => setClosureForm((f) => ({ ...f, wonUnitIds: e.target.value }))}
              className="input"
              placeholder="ex: 1, 2, 3"
            />
          </div>

          <div>
            <label className="label">Notite finalizare</label>
            <textarea
              value={closureForm.closureNotes}
              onChange={(e) => setClosureForm((f) => ({ ...f, closureNotes: e.target.value }))}
              className="input"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={() => setClosureOpen(false)} className="btn-secondary">
              Anuleaza
            </button>
            <button onClick={handleClosureSubmit} disabled={closureSubmitting} className="btn-primary !bg-emerald-600 hover:!bg-emerald-700">
              {closureSubmitting && (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{closureSubmitting ? 'Se finalizeaza...' : 'Marcheaza CASTIGAT'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
