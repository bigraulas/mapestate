import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  Calendar,
  Plus,
  Phone,
  Mail,
  Users,
  Eye,
  StickyNote,
  ListTodo,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { ActivityType, ACTIVITY_TYPE_LABELS } from '@mapestate/shared';
import { activitiesService } from '@/services/activities.service';
import { companiesService } from '@/services/companies.service';
import { requestsService } from '@/services/requests.service';
import Pagination from '@/components/shared/Pagination';
import Modal from '@/components/shared/Modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityRow {
  id: number;
  title: string;
  date: string;
  time?: string | null;
  duration?: number | null;
  done: boolean;
  notes?: string | null;
  activityType: ActivityType;
  company?: { id: number; name: string } | null;
  request?: { id: number; name: string } | null;
}

interface CompanyOption {
  id: number;
  name: string;
}

interface RequestOption {
  id: number;
  name: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type TabKey = 'planned' | 'done' | 'overdue' | 'all';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'planned', label: 'Planificate' },
  { key: 'done', label: 'Completate' },
  { key: 'overdue', label: 'Intarziate' },
  { key: 'all', label: 'Toate' },
];

const TYPE_ICONS: Record<ActivityType, React.ElementType> = {
  [ActivityType.CALL]: Phone,
  [ActivityType.EMAIL]: Mail,
  [ActivityType.MEETING]: Users,
  [ActivityType.TOUR]: Eye,
  [ActivityType.NOTE]: StickyNote,
  [ActivityType.TASK]: ListTodo,
};

const TYPE_COLORS: Record<ActivityType, string> = {
  [ActivityType.CALL]: 'bg-blue-50 text-blue-700',
  [ActivityType.EMAIL]: 'bg-violet-50 text-violet-700',
  [ActivityType.MEETING]: 'bg-amber-50 text-amber-700',
  [ActivityType.TOUR]: 'bg-green-50 text-green-700',
  [ActivityType.NOTE]: 'bg-gray-50 text-gray-700',
  [ActivityType.TASK]: 'bg-orange-50 text-orange-700',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ActivitiesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('planned');
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Add activity modal
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [activityType, setActivityType] = useState<string>('CALL');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [formCompanyId, setFormCompanyId] = useState('');
  const [formRequestId, setFormRequestId] = useState('');
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [requestOptions, setRequestOptions] = useState<RequestOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // ----- Data fetching -----

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      switch (activeTab) {
        case 'planned':
          res = await activitiesService.getMyPlanned(page, 20);
          break;
        case 'done':
          res = await activitiesService.getMyDone(page, 20);
          break;
        case 'overdue':
          res = await activitiesService.getMyOverdue(page, 20);
          break;
        default:
          res = await activitiesService.getAll(page, 20);
          break;
      }

      const body = res.data;
      setRows(body.data ?? []);
      setTotalPages(body.meta?.totalPages ?? 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // ----- Toggle done -----

  const toggleDone = async (activity: ActivityRow) => {
    try {
      await activitiesService.update(activity.id, { done: !activity.done });
      fetchActivities();
    } catch {
      // Silently fail
    }
  };

  // ----- Add activity -----

  const openForm = async () => {
    setFormOpen(true);
    setTitle('');
    setActivityType('CALL');
    setDate('');
    setTime('');
    setDuration('');
    setNotes('');
    setFormCompanyId('');
    setFormRequestId('');
    setFormError('');

    try {
      const [compRes, reqRes] = await Promise.all([
        companiesService.getAll({ page: 1, limit: 500 }),
        requestsService.getAll(1, 500),
      ]);
      setCompanies(compRes.data?.data || compRes.data || []);
      setRequestOptions(reqRes.data?.data || reqRes.data || []);
    } catch {
      // Silently fail
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        title,
        activityType,
        date,
      };

      if (time) payload.time = time;
      if (duration) payload.duration = Number(duration);
      if (notes) payload.notes = notes;
      if (formCompanyId) payload.companyId = Number(formCompanyId);
      if (formRequestId) payload.requestId = Number(formRequestId);

      await activitiesService.create(payload);
      setFormOpen(false);
      fetchActivities();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'Eroare la salvare.';
      setFormError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Helpers -----

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

  // ----- Render -----

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="page-title">Activitati</h1>
            <p className="page-subtitle">
              Gestioneaza vizionari, apeluri si intalniri
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={openForm}>
          <Plus className="w-4 h-4" />
          <span>Adauga activitate</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-white rounded-lg border border-slate-200 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.key === 'overdue' && (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activity list */}
      <div className="space-y-3">
        {loading ? (
          <div className="card card-body flex items-center justify-center py-16">
            <span className="inline-block w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <span className="ml-2 text-sm text-slate-500">Se incarca...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="card card-body text-center py-16">
            <p className="text-sm text-slate-400">
              Nicio activitate in aceasta categorie.
            </p>
          </div>
        ) : (
          rows.map((activity) => {
            const TypeIcon =
              TYPE_ICONS[activity.activityType] ?? ListTodo;
            const typeColor =
              TYPE_COLORS[activity.activityType] ?? 'bg-gray-50 text-gray-700';
            const isOverdue = activeTab === 'overdue';

            return (
              <div
                key={activity.id}
                className={`card card-body flex items-start gap-4 ${
                  isOverdue ? 'border-red-200 bg-red-50/30' : ''
                }`}
              >
                {/* Done checkbox */}
                <button
                  onClick={() => toggleDone(activity)}
                  className="mt-0.5 flex-shrink-0"
                  title={activity.done ? 'Marcheaza ca necompletata' : 'Marcheaza ca completata'}
                >
                  {activity.done ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle
                      className={`w-5 h-5 ${
                        isOverdue ? 'text-red-400' : 'text-slate-300'
                      } hover:text-primary-500 transition-colors`}
                    />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`${activity.done ? 'line-through text-slate-400' : 'text-slate-800'} text-sm font-medium`}
                    >
                      {activity.title}
                    </span>
                    <span
                      className={`badge ${typeColor} inline-flex items-center gap-1`}
                    >
                      <TypeIcon className="w-3 h-3" />
                      {ACTIVITY_TYPE_LABELS[activity.activityType] ??
                        activity.activityType}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(activity.date)}
                    </span>
                    {activity.time && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activity.time}
                      </span>
                    )}
                    {activity.duration != null && (
                      <span>{activity.duration} min</span>
                    )}
                  </div>

                  {(activity.company || activity.request) && (
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      {activity.company && (
                        <span>{activity.company.name}</span>
                      )}
                      {activity.request && (
                        <span>Cerere: {activity.request.name}</span>
                      )}
                    </div>
                  )}

                  {activity.notes && (
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                      {activity.notes}
                    </p>
                  )}
                </div>

                {/* Overdue indicator */}
                {isOverdue && !activity.done && (
                  <div className="flex-shrink-0">
                    <span className="badge bg-red-100 text-red-700">
                      Intarziata
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!loading && rows.length > 0 && (
        <div className="card mt-3">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Add activity modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title="Adauga activitate noua"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="act-title" className="label">
              Titlu *
            </label>
            <input
              id="act-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Ex: Apel client ABC"
              required
            />
          </div>

          <div>
            <label htmlFor="act-type" className="label">
              Tip activitate *
            </label>
            <select
              id="act-type"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="input"
            >
              {Object.values(ActivityType).map((type) => (
                <option key={type} value={type}>
                  {ACTIVITY_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="act-date" className="label">
                Data *
              </label>
              <input
                id="act-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="act-time" className="label">
                Ora
              </label>
              <input
                id="act-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="act-duration" className="label">
                Durata (min)
              </label>
              <input
                id="act-duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="input"
                placeholder="30"
                min={0}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="act-company" className="label">
                Companie
              </label>
              <select
                id="act-company"
                value={formCompanyId}
                onChange={(e) => setFormCompanyId(e.target.value)}
                className="input"
              >
                <option value="">-- Selecteaza --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="act-request" className="label">
                Cerere
              </label>
              <select
                id="act-request"
                value={formRequestId}
                onChange={(e) => setFormRequestId(e.target.value)}
                className="input"
              >
                <option value="">-- Selecteaza --</option>
                {requestOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="act-notes" className="label">
              Notite
            </label>
            <textarea
              id="act-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={3}
              placeholder="Detalii suplimentare..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="btn-secondary"
            >
              Anuleaza
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              <span>{submitting ? 'Se salveaza...' : 'Salveaza'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
