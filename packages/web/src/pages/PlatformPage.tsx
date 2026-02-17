import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { agenciesService } from '@/services/agencies.service';
import {
  Building2,
  Plus,
  X,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Agency {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  usersCount: number;
  createdAt: string;
}

export default function PlatformPage() {
  const { isPlatformAdmin } = useAuth();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    ownerEmail: '',
    ownerFirstName: '',
    ownerLastName: '',
    phone: '',
    address: '',
  });

  const loadAgencies = async () => {
    try {
      const res = await agenciesService.getAll();
      setAgencies(res.data);
    } catch {
      toast.error('Eroare la incarcarea agentiilor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgencies();
  }, []);

  if (!isPlatformAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Nu aveti permisiunea de a accesa aceasta pagina.</p>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await agenciesService.create(form);
      toast.success('Agentia a fost creata. Invitatia a fost trimisa.');
      setShowModal(false);
      setForm({ name: '', ownerEmail: '', ownerFirstName: '', ownerLastName: '', phone: '', address: '' });
      loadAgencies();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Eroare la crearea agentiei');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (agency: Agency) => {
    const newStatus = agency.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const action = newStatus === 'SUSPENDED' ? 'suspenda' : 'activa';

    if (!confirm(`Sigur doriti sa ${action}ti agentia "${agency.name}"?`)) return;

    try {
      await agenciesService.updateStatus(agency.id, newStatus);
      toast.success(
        `Agentia a fost ${newStatus === 'ACTIVE' ? 'activata' : 'suspendata'}`,
      );
      loadAgencies();
    } catch {
      toast.error('Eroare la actualizarea statusului');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Agentii</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestioneaza agentiile de pe platforma
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          <span>Adauga Agentie</span>
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      ) : agencies.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nicio agentie inregistrata</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  Agentie
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  Contact
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  Utilizatori
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  Creat
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  Actiuni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agencies.map((agency) => (
                <tr key={agency.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {agency.name}
                    </div>
                    {agency.address && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {agency.address}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div>{agency.email || '-'}</div>
                    <div className="text-xs text-slate-400">
                      {agency.phone || ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                      <Users className="w-3.5 h-3.5" />
                      {agency.usersCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {agency.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Activ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full">
                        <XCircle className="w-3 h-3" />
                        Suspendat
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(agency.createdAt).toLocaleDateString('ro-RO')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleStatus(agency)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        agency.status === 'ACTIVE'
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {agency.status === 'ACTIVE' ? 'Suspenda' : 'Activeaza'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Agency Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                Agentie Noua
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="label">Nume Agentie *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="input"
                  placeholder="Ex: Imobiliare Pro"
                  required
                />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-slate-500 uppercase mb-3">
                  Owner / Administrator
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="label">Email Owner *</label>
                    <input
                      type="email"
                      value={form.ownerEmail}
                      onChange={(e) =>
                        setForm({ ...form, ownerEmail: e.target.value })
                      }
                      className="input"
                      placeholder="owner@agentie.ro"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label">Prenume *</label>
                      <input
                        type="text"
                        value={form.ownerFirstName}
                        onChange={(e) =>
                          setForm({ ...form, ownerFirstName: e.target.value })
                        }
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Nume *</label>
                      <input
                        type="text"
                        value={form.ownerLastName}
                        onChange={(e) =>
                          setForm({ ...form, ownerLastName: e.target.value })
                        }
                        className="input"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-slate-500 uppercase mb-3">
                  Optional
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="label">Telefon</label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      className="input"
                      placeholder="+40..."
                    />
                  </div>
                  <div>
                    <label className="label">Adresa</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                      className="input"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Anuleaza
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{submitting ? 'Se creeaza...' : 'Creeaza'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
