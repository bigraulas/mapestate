import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Loader2,
  X,
  Trash2,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
} from 'lucide-react';
import type { Person, Company, Label, PaginatedResponse } from '@mapestate/shared';
import { personsService, companiesService, labelsService, usersService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import DataTable, { type Column } from '@/components/shared/DataTable';
import Pagination from '@/components/shared/Pagination';
import Modal from '@/components/shared/Modal';

export default function PersonsPage() {
  const { isAdmin } = useAuth();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[] | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedPerson, setExpandedPerson] = useState<Person | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [agencyUsers, setAgencyUsers] = useState<{id: number; firstName: string; lastName: string}[]>([]);

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    jobTitle: '',
    emails: [''],
    phones: [''],
    companyId: '' as string,
    labelId: '' as string,
  });

  // Selectors data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);

  const fetchPersons = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await personsService.getAll({ page: p, limit: 20 });
      const payload: PaginatedResponse<Person> = res.data;
      setPersons(payload.data);
      setTotalPages(payload.meta.totalPages);
    } catch {
      setPersons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersons(page);
  }, [page, fetchPersons]);

  // Load companies and labels for the form
  const loadFormData = useCallback(async () => {
    try {
      const [companiesRes, labelsRes] = await Promise.all([
        companiesService.getAll({ page: 1, limit: 100 }),
        labelsService.getAll(),
      ]);
      const compPayload: PaginatedResponse<Company> = companiesRes.data;
      setCompanies(compPayload.data);
      setLabels(labelsRes.data);
    } catch {
      // Silently fail - dropdowns will be empty
    }
  }, []);

  useEffect(() => {
    if (showForm) loadFormData();
  }, [showForm, loadFormData]);

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await personsService.search(searchQuery);
        setSearchResults(res.data);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleRowClick = async (person: Person) => {
    if (expandedId === person.id) {
      setExpandedId(null);
      setExpandedPerson(null);
      return;
    }
    setExpandedId(person.id);
    if (isAdmin && agencyUsers.length === 0) {
      try {
        const usersRes = await usersService.getAll(1, 100);
        setAgencyUsers(usersRes.data?.data ?? []);
      } catch { /* ignore */ }
    }
    setLoadingDetail(true);
    try {
      const res = await personsService.getById(person.id);
      setExpandedPerson(res.data);
    } catch {
      setExpandedPerson(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreatePerson = async () => {
    if (!formData.name.trim()) {
      setFormError('Numele persoanei este obligatoriu.');
      return;
    }
    setFormError('');
    setFormSubmitting(true);

    const payload: Record<string, unknown> = {
      name: formData.name,
      jobTitle: formData.jobTitle || undefined,
      emails: formData.emails.filter((e) => e.trim()),
      phones: formData.phones.filter((p) => p.trim()),
      companyId: formData.companyId ? parseInt(formData.companyId, 10) : undefined,
      labelId: formData.labelId ? parseInt(formData.labelId, 10) : undefined,
    };

    try {
      await personsService.create(payload);
      setShowForm(false);
      resetForm();
      fetchPersons(page);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'Eroare la crearea persoanei.';
      setFormError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      jobTitle: '',
      emails: [''],
      phones: [''],
      companyId: '',
      labelId: '',
    });
    setFormError('');
  };

  const updateArrayField = (
    field: 'emails' | 'phones',
    index: number,
    value: string,
  ) => {
    setFormData((prev) => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const addArrayField = (field: 'emails' | 'phones') => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const removeArrayField = (field: 'emails' | 'phones', index: number) => {
    setFormData((prev) => {
      const arr = [...prev[field]];
      arr.splice(index, 1);
      return { ...prev, [field]: arr.length === 0 ? [''] : arr };
    });
  };

  const displayData = searchResults !== null ? searchResults : persons;

  const columns: Column<Person>[] = [
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
      key: 'jobTitle',
      header: 'Functie',
      render: (row) => row.jobTitle ?? '-',
    },
    {
      key: 'company',
      header: 'Companie',
      render: (row) => row.company?.name ?? '-',
    },
    {
      key: 'label',
      header: 'Eticheta',
      render: (row) =>
        row.label ? (
          <span
            className="badge"
            style={{
              backgroundColor: `${row.label.color}20`,
              color: row.label.color,
            }}
          >
            {row.label.name}
          </span>
        ) : (
          '-'
        ),
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
    ...(isAdmin ? [{
      key: 'user' as keyof Person,
      header: 'Agent',
      render: (row: Person) => {
        const u = (row as unknown as Record<string, unknown>).user as {firstName?: string; lastName?: string} | null | undefined;
        return u ? `${u.firstName} ${u.lastName}` : '-';
      },
    }] : []),
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="page-title">Persoane</h1>
            <p className="page-subtitle hidden sm:block">
              Gestioneaza persoanele de contact
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          <span>Adauga persoana</span>
        </button>
      </div>

      {/* Search + Table */}
      <div className="card">
        {/* Search bar */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input !pl-9"
              placeholder="Cauta persoana..."
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {searchResults !== null && (
            <p className="text-xs text-slate-400 mt-2">
              {searchResults.length} rezultat{searchResults.length !== 1 ? 'e' : ''} pentru &quot;{searchQuery}&quot;
            </p>
          )}
        </div>

        <DataTable<Person>
          columns={columns}
          data={displayData}
          loading={loading && searchResults === null}
          emptyMessage={
            searchResults !== null
              ? 'Nicio persoana gasita.'
              : 'Nu exista persoane inregistrate.'
          }
          onRowClick={handleRowClick}
          renderMobileCard={(row) => (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {expandedId === row.id ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="font-medium text-slate-900 block truncate">{row.name}</span>
                    {row.jobTitle && (
                      <span className="text-xs text-slate-500">{row.jobTitle}</span>
                    )}
                  </div>
                </div>
                {row.label && (
                  <span
                    className="badge text-xs shrink-0"
                    style={{ backgroundColor: `${row.label.color}20`, color: row.label.color }}
                  >
                    {row.label.name}
                  </span>
                )}
              </div>
              <div className="ml-6 mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {row.company?.name && <span>{row.company.name}</span>}
                <span className="badge bg-blue-50 text-blue-700">{row.openDeals} active</span>
                <span className="badge bg-slate-100 text-slate-600">{row.closedDeals} inchise</span>
              </div>
            </div>
          )}
          renderExpandedRow={(row) => {
            if (row.id !== expandedId) return null;
            return (
              <div className="bg-slate-50/50 px-6 py-4">
                {loadingDetail ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400">Se incarca...</span>
                  </div>
                ) : expandedPerson ? (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                    {expandedPerson.emails && expandedPerson.emails.length > 0 && expandedPerson.emails[0] && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{expandedPerson.emails.filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {expandedPerson.phones && expandedPerson.phones.length > 0 && expandedPerson.phones[0] && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{expandedPerson.phones.filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {!expandedPerson.emails?.[0] && !expandedPerson.phones?.[0] && (
                      <span className="text-xs text-slate-400">Nu exista date de contact.</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Nu s-au putut incarca detaliile.</span>
                )}
                {isAdmin && (
                  <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium">Reasigneaza la:</span>
                    <select
                      className="input !py-1 !text-xs w-48"
                      defaultValue=""
                      onChange={async (e) => {
                        const newUserId = parseInt(e.target.value, 10);
                        if (!newUserId) return;
                        setReassigning(true);
                        try {
                          await personsService.reassign(row.id, newUserId);
                          fetchPersons(page);
                          setExpandedId(null);
                          setExpandedPerson(null);
                        } catch { /* ignore */ }
                        setReassigning(false);
                      }}
                      disabled={reassigning}
                    >
                      <option value="">-- Selecteaza agent --</option>
                      {agencyUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                        </option>
                      ))}
                    </select>
                    {reassigning && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                  </div>
                )}
              </div>
            );
          }}
        />

        {searchResults === null && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Create person modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        title="Persoana noua"
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {formError}
            </div>
          )}

          <div>
            <label className="label">Nume *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="input"
              placeholder="Nume complet"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Functie</label>
            <input
              type="text"
              value={formData.jobTitle}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, jobTitle: e.target.value }))
              }
              className="input"
              placeholder="ex: Director General"
            />
          </div>

          {/* Emails */}
          <div>
            <label className="label">Emailuri</label>
            {formData.emails.map((email, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    updateArrayField('emails', idx, e.target.value)
                  }
                  className="input flex-1"
                  placeholder="email@exemplu.ro"
                />
                {formData.emails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayField('emails', idx)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayField('emails')}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              + Adauga email
            </button>
          </div>

          {/* Phones */}
          <div>
            <label className="label">Telefoane</label>
            {formData.phones.map((phone, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    updateArrayField('phones', idx, e.target.value)
                  }
                  className="input flex-1"
                  placeholder="0712 345 678"
                />
                {formData.phones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayField('phones', idx)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayField('phones')}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              + Adauga telefon
            </button>
          </div>

          {/* Company select */}
          <div>
            <label className="label">Companie</label>
            <select
              value={formData.companyId}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  companyId: e.target.value,
                }))
              }
              className="input"
            >
              <option value="">-- Selecteaza companie --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Label select */}
          <div>
            <label className="label">Eticheta</label>
            <select
              value={formData.labelId}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  labelId: e.target.value,
                }))
              }
              className="input"
            >
              <option value="">-- Selecteaza eticheta --</option>
              {labels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="btn-secondary"
            >
              <X className="w-4 h-4" />
              <span>Anuleaza</span>
            </button>
            <button
              type="button"
              onClick={handleCreatePerson}
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
