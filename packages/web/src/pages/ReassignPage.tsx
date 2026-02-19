import { useState, useEffect } from 'react';
import { ArrowRight, AlertTriangle, Users, Building, Handshake, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersService } from '@/services/users.service';

interface AgencyUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface PortfolioCount {
  persons: number;
  companies: number;
  requests: number;
  offers: number;
}

export default function ReassignPage() {
  const [users, setUsers] = useState<AgencyUser[]>([]);
  const [fromUserId, setFromUserId] = useState<number | ''>('');
  const [toUserId, setToUserId] = useState<number | ''>('');
  const [counts, setCounts] = useState<PortfolioCount | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    usersService.getAll(1, 100).then((res) => {
      setUsers(res.data?.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!fromUserId) {
      setCounts(null);
      return;
    }
    setLoadingCounts(true);
    usersService
      .portfolioCount(fromUserId as number)
      .then((res) => setCounts(res.data))
      .catch(() => setCounts(null))
      .finally(() => setLoadingCounts(false));
  }, [fromUserId]);

  // Reset toUserId if it matches fromUserId
  useEffect(() => {
    if (toUserId && toUserId === fromUserId) {
      setToUserId('');
    }
  }, [fromUserId, toUserId]);

  const totalEntities = counts
    ? counts.persons + counts.companies + counts.requests + counts.offers
    : 0;

  const fromUser = users.find((u) => u.id === fromUserId);
  const toUser = users.find((u) => u.id === toUserId);

  const handleSubmit = async () => {
    if (!fromUserId || !toUserId) return;
    setSubmitting(true);
    try {
      const res = await usersService.bulkReassignPortfolio(
        fromUserId as number,
        toUserId as number,
      );
      const r = res.data;
      toast.success(
        `Reasignat: ${r.persons} persoane, ${r.companies} companii, ${r.requests} deal-uri, ${r.offers} oferte`,
      );
      setFromUserId('');
      setToUserId('');
      setCounts(null);
      setShowConfirm(false);
    } catch {
      toast.error('Eroare la reasignare');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">
        Reasignare Portofoliu
      </h1>
      <p className="text-sm text-slate-500 mb-8">
        Transfera toate contactele, deal-urile si ofertele de la un agent la altul
      </p>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        {/* From agent */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Agent sursa
          </label>
          <select
            className="input"
            value={fromUserId}
            onChange={(e) => setFromUserId(e.target.value ? parseInt(e.target.value) : '')}
          >
            <option value="">-- Selecteaza agentul de la care transferi --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.email})
              </option>
            ))}
          </select>
        </div>

        {/* Summary card */}
        {fromUserId && (
          <div className="bg-slate-50 rounded-lg p-4">
            {loadingCounts ? (
              <p className="text-sm text-slate-500">Se incarca...</p>
            ) : counts ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{counts.persons}</div>
                    <div className="text-xs text-slate-500">Persoane</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{counts.companies}</div>
                    <div className="text-xs text-slate-500">Companii</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Handshake className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{counts.requests}</div>
                    <div className="text-xs text-slate-500">Deal-uri</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{counts.offers}</div>
                    <div className="text-xs text-slate-500">Oferte</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Nu s-au putut incarca datele</p>
            )}
          </div>
        )}

        {/* To agent */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Agent destinatie
          </label>
          <select
            className="input"
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value ? parseInt(e.target.value) : '')}
            disabled={!fromUserId}
          >
            <option value="">-- Selecteaza agentul catre care transferi --</option>
            {users
              .filter((u) => u.id !== fromUserId)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.email})
                </option>
              ))}
          </select>
        </div>

        {/* Action */}
        <div className="pt-2">
          {!showConfirm ? (
            <button
              className="btn btn-primary w-full flex items-center justify-center gap-2"
              disabled={!fromUserId || !toUserId || totalEntities === 0}
              onClick={() => setShowConfirm(true)}
            >
              <ArrowRight className="w-4 h-4" />
              Reasigneaza tot ({totalEntities} entitati)
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  Esti sigur? <strong>{totalEntities} entitati</strong> vor fi
                  mutate de la{' '}
                  <strong>
                    {fromUser?.firstName} {fromUser?.lastName}
                  </strong>{' '}
                  la{' '}
                  <strong>
                    {toUser?.firstName} {toUser?.lastName}
                  </strong>
                  . Aceasta actiune nu poate fi anulata automat.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-primary flex-1"
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? 'Se proceseaza...' : 'Confirma reasignarea'}
                </button>
                <button
                  className="btn btn-secondary flex-1"
                  disabled={submitting}
                  onClick={() => setShowConfirm(false)}
                >
                  Anuleaza
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
