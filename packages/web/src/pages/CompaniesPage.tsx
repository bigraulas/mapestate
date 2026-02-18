import { useState, useEffect, useCallback } from 'react';
import {
  Building,
  Plus,
  ChevronDown,
  ChevronRight,
  Loader2,
  Users,
  X,
  Search,
} from 'lucide-react';
import type { Company, Person, PaginatedResponse } from '@mapestate/shared';
import { companiesService } from '@/services';
import DataTable, { type Column } from '@/components/shared/DataTable';
import Pagination from '@/components/shared/Pagination';
import Modal from '@/components/shared/Modal';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedPersons, setExpandedPersons] = useState<Person[]>([]);
  const [loadingPersons, setLoadingPersons] = useState(false);

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [lookingUpCui, setLookingUpCui] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    vatNumber: '',
    jNumber: '',
    address: '',
  });
  const [cuiInput, setCuiInput] = useState('');
  const [autoFilled, setAutoFilled] = useState(false);

  const fetchCompanies = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await companiesService.getAll({ page: p, limit: 20 });
      const payload: PaginatedResponse<Company> = res.data;
      setCompanies(payload.data);
      setTotalPages(payload.meta.totalPages);
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies(page);
  }, [page, fetchCompanies]);

  const handleRowClick = async (company: Company) => {
    if (expandedId === company.id) {
      setExpandedId(null);
      setExpandedPersons([]);
      return;
    }
    setExpandedId(company.id);
    setLoadingPersons(true);
    try {
      const res = await companiesService.getById(company.id);
      const detail: Company = res.data;
      setExpandedPersons(detail.persons ?? []);
    } catch {
      setExpandedPersons([]);
    } finally {
      setLoadingPersons(false);
    }
  };

  const handleCreateCompany = async () => {
    if (!formData.name.trim()) {
      setFormError('Numele companiei este obligatoriu.');
      return;
    }
    setFormError('');
    setFormSubmitting(true);
    try {
      await companiesService.create(formData);
      setShowForm(false);
      setFormData({ name: '', vatNumber: '', jNumber: '', address: '' });
      setCuiInput('');
      setAutoFilled(false);
      fetchCompanies(page);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'Eroare la crearea companiei.';
      setFormError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleLookupCui = async () => {
    const cui = cuiInput.replace(/\D/g, '');
    if (!cui) {
      setFormError('Introdu un CUI valid pentru cautare.');
      return;
    }
    setFormError('');
    setAutoFilled(false);
    setLookingUpCui(true);
    try {
      const res = await companiesService.lookupCui(cui);
      const data = res.data;
      if (!data || !data.name) {
        setFormError('Nu s-a gasit nicio firma cu acest CUI.');
        return;
      }
      setFormData({
        name: data.name ?? '',
        address: data.address ?? '',
        jNumber: data.jNumber ?? '',
        vatNumber: data.vatNumber ?? '',
      });
      setAutoFilled(true);
      setTimeout(() => setAutoFilled(false), 2000);
    } catch {
      setFormError('Eroare la interogarea ANAF. Incearca din nou.');
    } finally {
      setLookingUpCui(false);
    }
  };

  const columns: Column<Company>[] = [
    {
      key: 'name',
      header: 'Nume',
      render: (row) => (
        <div className="flex items-center gap-2">
          {expandedId === row.id ? (
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
          <span className="font-medium text-slate-900">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'vatNumber',
      header: 'CUI',
      render: (row) => (
        <span className="text-xs font-mono text-slate-500">
          {row.vatNumber ?? '-'}
        </span>
      ),
    },
    {
      key: 'jNumber',
      header: 'Nr. Reg.',
      render: (row) => (
        <span className="text-xs font-mono text-slate-500">
          {row.jNumber ?? '-'}
        </span>
      ),
    },
    {
      key: 'address',
      header: 'Adresa',
      render: (row) => row.address ?? '-',
    },
    {
      key: 'openDeals',
      header: 'Dealuri Active',
      render: (row) => (
        <span className="badge bg-blue-50 text-blue-700">
          {row.openDeals}
        </span>
      ),
    },
    {
      key: 'closedDeals',
      header: 'Dealuri Inchise',
      render: (row) => (
        <span className="badge bg-slate-100 text-slate-600">
          {row.closedDeals}
        </span>
      ),
    },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Building className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="page-title">Companii</h1>
            <p className="page-subtitle hidden sm:block">
              Gestioneaza companiile din baza de date
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          <span>Adauga companie</span>
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <DataTable<Company>
          columns={columns}
          data={companies}
          loading={loading}
          emptyMessage="Nu exista companii inregistrate."
          onRowClick={handleRowClick}
          renderMobileCard={(row) => (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2">
                {expandedId === row.id ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
                <span className="font-medium text-slate-900 truncate">{row.name}</span>
              </div>
              <div className="ml-6 mt-1.5 space-y-0.5">
                {row.vatNumber && (
                  <p className="text-xs font-mono text-slate-500">{row.vatNumber}</p>
                )}
                {row.address && (
                  <p className="text-xs text-slate-500 truncate">{row.address}</p>
                )}
                <div className="flex items-center gap-3 pt-1">
                  <span className="badge bg-blue-50 text-blue-700">{row.openDeals} active</span>
                  <span className="badge bg-slate-100 text-slate-600">{row.closedDeals} inchise</span>
                </div>
              </div>
            </div>
          )}
          renderExpandedRow={(row) => {
            if (row.id !== expandedId) return null;
            return (
              <div className="bg-slate-50/50 px-4 sm:px-6 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">
                    Persoane de contact
                  </span>
                </div>
                {loadingPersons ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400">Se incarca...</span>
                  </div>
                ) : expandedPersons.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Nu exista persoane asociate acestei companii.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {expandedPersons.map((person) => (
                      <div
                        key={person.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 bg-white rounded-lg border border-slate-100 px-4 py-2"
                      >
                        <div>
                          <span className="text-sm font-medium text-slate-800">
                            {person.name}
                          </span>
                          {person.jobTitle && (
                            <span className="text-xs text-slate-400 ml-2">
                              {person.jobTitle}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {person.emails?.[0] && <span className="truncate">{person.emails[0]}</span>}
                          {person.phones?.[0] && <span className="truncate">{person.phones[0]}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }}
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* Create company modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setFormError('');
        }}
        title="Companie noua"
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {formError}
            </div>
          )}

          {/* CUI lookup — prominent, first */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <label className="label !text-blue-900 !font-semibold">
              Cod Unic de Identificare (CUI)
            </label>
            <p className="text-xs text-blue-600 mb-2">
              Completeaza automat datele firmei din ANAF
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={cuiInput}
                onChange={(e) => setCuiInput(e.target.value.replace(/\s/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLookupCui(); }}
                className="input flex-1 !bg-white text-lg font-mono tracking-wider"
                placeholder="ex: 12345678"
                autoFocus
              />
              <button
                type="button"
                onClick={handleLookupCui}
                disabled={lookingUpCui}
                className="btn-primary shrink-0 !px-5"
              >
                {lookingUpCui ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>{lookingUpCui ? 'Se cauta...' : 'Cauta'}</span>
              </button>
            </div>
          </div>

          {/* Auto-filled fields */}
          <div className={`space-y-4 transition-all duration-500 ${autoFilled ? 'ring-2 ring-green-300 rounded-lg p-3 bg-green-50/50' : ''}`}>
            <div>
              <label className="label">Nume *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value.toUpperCase() }))
                }
                className="input uppercase"
                placeholder="NUMELE COMPANIEI"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">CUI / Cod fiscal</label>
                <input
                  type="text"
                  value={formData.vatNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, vatNumber: e.target.value.toUpperCase() }))
                  }
                  className="input uppercase"
                  placeholder="RO12345678"
                />
              </div>
              <div>
                <label className="label">Nr. Registru</label>
                <input
                  type="text"
                  value={formData.jNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, jNumber: e.target.value }))
                  }
                  className="input"
                  placeholder="J40/123/2024"
                />
              </div>
            </div>

            <div>
              <label className="label">Adresa</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                className="input"
                placeholder="Adresa sediului social"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormError('');
              }}
              className="btn-secondary"
            >
              <X className="w-4 h-4" />
              <span>Anuleaza</span>
            </button>
            <button
              type="button"
              onClick={handleCreateCompany}
              disabled={formSubmitting}
              className="btn-primary"
            >
              {formSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{formSubmitting ? 'Se salveaza...' : 'Salveaza'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
