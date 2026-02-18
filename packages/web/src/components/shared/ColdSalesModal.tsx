import { useState, useEffect, useMemo } from 'react';
import { Search, Building2, Users, Send, Mail, MailX } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import { dealsService } from '@/services/deals.service';
import { buildingsService } from '@/services/buildings.service';
import { personsService } from '@/services/persons.service';

interface Building {
  id: number;
  name: string;
  availableSqm?: number | null;
  location?: { name: string } | null;
  address?: string | null;
}

interface Person {
  id: number;
  name: string;
  companyId?: number | null;
  company?: { name: string } | null;
  emails?: string[];
}

interface ColdSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ColdSalesModal({
  isOpen,
  onClose,
  onSuccess,
}: ColdSalesModalProps) {
  // Data
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Selections
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<number[]>([]);
  const [selectedPersonIds, setSelectedPersonIds] = useState<number[]>([]);
  const [message, setMessage] = useState('');

  // Search filters
  const [buildingSearch, setBuildingSearch] = useState('');
  const [personSearch, setPersonSearch] = useState('');

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoadingData(true);
      try {
        const [buildingsRes, personsRes] = await Promise.all([
          buildingsService.getAll({ page: 1, limit: 200 }),
          personsService.getAll({ page: 1, limit: 500 }),
        ]);
        setBuildings(buildingsRes.data?.data || buildingsRes.data || []);
        setPersons(personsRes.data?.data || personsRes.data || []);
      } catch {
        // Silently fail - lists will be empty
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [isOpen]);

  // Filtered lists
  const filteredBuildings = useMemo(() => {
    if (!buildingSearch.trim()) return buildings;
    const q = buildingSearch.toLowerCase();
    return buildings.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.location?.name?.toLowerCase().includes(q) ||
        b.address?.toLowerCase().includes(q),
    );
  }, [buildings, buildingSearch]);

  const filteredPersons = useMemo(() => {
    if (!personSearch.trim()) return persons;
    const q = personSearch.toLowerCase();
    return persons.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.company?.name?.toLowerCase().includes(q),
    );
  }, [persons, personSearch]);

  // Toggle helpers
  const toggleBuilding = (id: number) => {
    setSelectedBuildingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const togglePerson = (id: number) => {
    setSelectedPersonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Select all / deselect all for current filtered view
  const toggleAllBuildings = () => {
    const filteredIds = filteredBuildings.map((b) => b.id);
    const allSelected = filteredIds.every((id) =>
      selectedBuildingIds.includes(id),
    );
    if (allSelected) {
      setSelectedBuildingIds((prev) =>
        prev.filter((id) => !filteredIds.includes(id)),
      );
    } else {
      setSelectedBuildingIds((prev) => [
        ...new Set([...prev, ...filteredIds]),
      ]);
    }
  };

  const toggleAllPersons = () => {
    const filteredIds = filteredPersons.map((p) => p.id);
    const allSelected = filteredIds.every((id) =>
      selectedPersonIds.includes(id),
    );
    if (allSelected) {
      setSelectedPersonIds((prev) =>
        prev.filter((id) => !filteredIds.includes(id)),
      );
    } else {
      setSelectedPersonIds((prev) => [
        ...new Set([...prev, ...filteredIds]),
      ]);
    }
  };

  // Reset
  const resetForm = () => {
    setSelectedBuildingIds([]);
    setSelectedPersonIds([]);
    setMessage('');
    setBuildingSearch('');
    setPersonSearch('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Submit
  const handleSubmit = async () => {
    if (selectedBuildingIds.length === 0 || selectedPersonIds.length === 0)
      return;

    setError('');
    setSubmitting(true);

    try {
      const res = await dealsService.createColdSales({
        buildingIds: selectedBuildingIds,
        recipientPersonIds: selectedPersonIds,
        message: message.trim() || undefined,
      });

      // Send offers for each created deal (skip persons without emails)
      const raw = res.data;
      const deals: { id: number; personId?: number }[] = raw?.deals || (Array.isArray(raw) ? raw : [raw]);

      // Only send for deals whose person has emails
      const dealsWithEmail = deals.filter((deal) => {
        const p = persons.find((pp) => pp.id === deal.personId);
        return p?.emails && p.emails.length > 0;
      });

      await Promise.all(
        dealsWithEmail.map((deal) =>
          dealsService.sendOffers({
            dealId: deal.id,
            buildingIds: selectedBuildingIds,
            message: message.trim() || undefined,
          }),
        ),
      );

      resetForm();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'Eroare la trimiterea ofertelor.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Ofertare Manuala - Trimite oferte">
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loadingData && (
          <div className="flex items-center justify-center py-8">
            <span className="inline-block w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <span className="ml-2 text-sm text-slate-500">
              Se incarca datele...
            </span>
          </div>
        )}

        {!loadingData && (
          <>
            {/* Section 1: Select Buildings */}
            <div>
              <label className="label flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary-600" />
                <span>Selecteaza cladiri</span>
                {selectedBuildingIds.length > 0 && (
                  <span className="text-xs font-normal text-slate-400">
                    ({selectedBuildingIds.length} selectate)
                  </span>
                )}
              </label>

              {/* Search input */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={buildingSearch}
                  onChange={(e) => setBuildingSearch(e.target.value)}
                  className="input !pl-9"
                  placeholder="Cauta cladire..."
                />
              </div>

              {/* Checkbox list */}
              <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                {filteredBuildings.length > 0 && (
                  <label className="flex items-center gap-2 text-xs font-medium text-primary-600 cursor-pointer pb-1 mb-1 border-b border-slate-100">
                    <input
                      type="checkbox"
                      checked={
                        filteredBuildings.length > 0 &&
                        filteredBuildings.every((b) =>
                          selectedBuildingIds.includes(b.id),
                        )
                      }
                      onChange={toggleAllBuildings}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Selecteaza tot</span>
                  </label>
                )}

                {filteredBuildings.length === 0 && (
                  <p className="text-sm text-slate-400 py-2 text-center">
                    {buildings.length === 0
                      ? 'Nu exista cladiri.'
                      : 'Niciun rezultat.'}
                  </p>
                )}

                {filteredBuildings.map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBuildingIds.includes(b.id)}
                      onChange={() => toggleBuilding(b.id)}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="font-medium">{b.name}</span>
                      {b.location?.name && (
                        <span className="text-slate-400"> - {b.location.name}</span>
                      )}
                      {!b.location?.name && b.address && (
                        <span className="text-slate-400"> - {b.address}</span>
                      )}
                    </span>
                    {b.availableSqm != null && (
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {b.availableSqm.toLocaleString('ro-RO')} mp
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Section 2: Select Recipients */}
            <div>
              <label className="label flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-600" />
                <span>Selecteaza destinatari</span>
                {selectedPersonIds.length > 0 && (
                  <span className="text-xs font-normal text-slate-400">
                    ({selectedPersonIds.length} selectati)
                  </span>
                )}
              </label>

              {/* Search input */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                  className="input !pl-9"
                  placeholder="Cauta persoana..."
                />
              </div>

              {/* Checkbox list */}
              <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                {filteredPersons.length > 0 && (
                  <label className="flex items-center gap-2 text-xs font-medium text-primary-600 cursor-pointer pb-1 mb-1 border-b border-slate-100">
                    <input
                      type="checkbox"
                      checked={
                        filteredPersons.length > 0 &&
                        filteredPersons.every((p) =>
                          selectedPersonIds.includes(p.id),
                        )
                      }
                      onChange={toggleAllPersons}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Selecteaza tot</span>
                  </label>
                )}

                {filteredPersons.length === 0 && (
                  <p className="text-sm text-slate-400 py-2 text-center">
                    {persons.length === 0
                      ? 'Nu exista persoane.'
                      : 'Niciun rezultat.'}
                  </p>
                )}

                {filteredPersons.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPersonIds.includes(p.id)}
                      onChange={() => togglePerson(p.id)}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="font-medium">{p.name}</span>
                      {p.company?.name && (
                        <span className="text-slate-400">
                          {' '}
                          - {p.company.name}
                        </span>
                      )}
                    </span>
                    {p.emails && p.emails.length > 0 ? (
                      <Mail className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <MailX className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Section 3: Message */}
            <div>
              <label htmlFor="cold-sales-message" className="label">
                Mesaj (optional)
              </label>
              <textarea
                id="cold-sales-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="input"
                rows={3}
                placeholder="Adauga un mesaj personalizat pentru email..."
              />
            </div>

            {/* Warning: persons without emails */}
            {selectedPersonIds.length > 0 && (() => {
              const noEmail = selectedPersonIds.filter((id) => {
                const p = persons.find((pp) => pp.id === id);
                return !p?.emails || p.emails.length === 0;
              });
              return noEmail.length > 0 ? (
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
                  <MailX className="w-4 h-4 inline mr-1" />
                  {noEmail.length} {noEmail.length === 1 ? 'contact nu are' : 'contacte nu au'} email si {noEmail.length === 1 ? 'nu va primi' : 'nu vor primi'} oferta.
                </div>
              ) : null;
            })()}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary"
              >
                Anuleaza
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  selectedBuildingIds.length === 0 ||
                  selectedPersonIds.length === 0
                }
                className="btn-primary"
              >
                {submitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>
                  {submitting
                    ? 'Se trimite...'
                    : `Trimite la ${selectedPersonIds.length} contacte`}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
