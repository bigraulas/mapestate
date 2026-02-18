import { useState, useEffect, lazy, Suspense, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, List, MapPin } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import { dealsService } from '@/services/deals.service';
import { companiesService } from '@/services/companies.service';
import { personsService } from '@/services/persons.service';
import { locationsService } from '@/services/locations.service';

const CirclePickerMap = lazy(() => import('@/components/map/CirclePickerMap'));

interface Company {
  id: number;
  name: string;
}

interface Person {
  id: number;
  name: string;
  companyId?: number | null;
}

interface Location {
  id: number;
  name: string;
  county: string;
}

interface RequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RequestFormModal({
  isOpen,
  onClose,
  onSuccess,
}: RequestFormModalProps) {
  const navigate = useNavigate();
  const [requestType, setRequestType] = useState<'RENT' | 'SALE'>('RENT');
  const [numberOfSqm, setNumberOfSqm] = useState('');
  const [minHeight, setMinHeight] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [personId, setPersonId] = useState('');
  const [selectedLocationIds, setSelectedLocationIds] = useState<number[]>([]);

  // Circle search states
  const [locationMode, setLocationMode] = useState<'list' | 'map'>('map');
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState(30);

  // Inline create states
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [showNewPerson, setShowNewPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [creatingPerson, setCreatingPerson] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const [compRes, persRes, locRes] = await Promise.all([
          companiesService.getAll({ page: 1, limit: 500 }),
          personsService.getAll({ page: 1, limit: 500 }),
          locationsService.getAll(),
        ]);
        setCompanies(compRes.data?.data || compRes.data || []);
        setPersons(persRes.data?.data || persRes.data || []);
        setLocations(locRes.data?.data || locRes.data || []);
      } catch {
        // Silently fail - selects will be empty
      }
    };

    loadData();
  }, [isOpen]);

  const filteredPersons = companyId
    ? persons.filter((p) => p.companyId === Number(companyId))
    : persons;

  const toggleLocation = (locId: number) => {
    setSelectedLocationIds((prev) =>
      prev.includes(locId)
        ? prev.filter((id) => id !== locId)
        : [...prev, locId],
    );
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    setCreatingCompany(true);
    try {
      const res = await companiesService.create({ name: newCompanyName.trim() });
      const created = res.data;
      setCompanies((prev) => [created, ...prev]);
      setCompanyId(String(created.id));
      setNewCompanyName('');
      setShowNewCompany(false);
    } catch {
      setError('Eroare la crearea companiei.');
    } finally {
      setCreatingCompany(false);
    }
  };

  const handleCreatePerson = async () => {
    if (!newPersonName.trim()) return;
    setCreatingPerson(true);
    try {
      const payload: Record<string, unknown> = { name: newPersonName.trim() };
      if (companyId) payload.companyId = Number(companyId);
      if (newPersonEmail.trim()) payload.emails = [newPersonEmail.trim()];
      if (newPersonPhone.trim()) payload.phones = [newPersonPhone.trim()];
      const res = await personsService.create(payload);
      const created = res.data;
      setPersons((prev) => [created, ...prev]);
      setPersonId(String(created.id));
      setNewPersonName('');
      setNewPersonEmail('');
      setNewPersonPhone('');
      setShowNewPerson(false);
    } catch {
      setError('Eroare la crearea persoanei de contact.');
    } finally {
      setCreatingPerson(false);
    }
  };

  // Auto-generate deal name from company + sqm
  const generateName = () => {
    const comp = companies.find((c) => c.id === Number(companyId));
    const parts: string[] = [];
    if (comp) parts.push(comp.name);
    if (numberOfSqm) parts.push(`${numberOfSqm}mp`);
    if (parts.length === 0) return 'Cerere noua';
    return parts.join(' – ');
  };

  const resetForm = () => {
    setRequestType('RENT');
    setNumberOfSqm('');
    setMinHeight('');
    setCompanyId('');
    setPersonId('');
    setSelectedLocationIds([]);
    setLocationMode('map');
    setSearchCenter(null);
    setSearchRadius(30);
    setError('');
    setShowNewCompany(false);
    setNewCompanyName('');
    setShowNewPerson(false);
    setNewPersonName('');
    setNewPersonEmail('');
    setNewPersonPhone('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!companyId) {
      setError('Selecteaza un client.');
      return;
    }
    if (!personId) {
      setError('Selecteaza o persoana de contact.');
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        name: generateName(),
        requestType,
        companyId: Number(companyId),
        personId: Number(personId),
      };

      if (numberOfSqm) payload.numberOfSqm = Number(numberOfSqm);
      if (minHeight) payload.minHeight = Number(minHeight);
      if (locationMode === 'list' && selectedLocationIds.length > 0) {
        payload.locationIds = selectedLocationIds;
      }
      if (locationMode === 'map' && searchCenter) {
        payload.searchLat = searchCenter.lat;
        payload.searchLng = searchCenter.lng;
        payload.searchRadius = searchRadius;
      }

      const res = await dealsService.create(payload);
      const createdId = res.data?.id;
      resetForm();
      onSuccess();
      onClose();
      if (createdId) {
        navigate(`/deals/${createdId}?tab=proprietati`);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'Eroare la salvare.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Cerere noua">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Request type toggle */}
        <div className="flex items-center gap-3">
          <label className="label mb-0 text-slate-500">Tip:</label>
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setRequestType('RENT')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                requestType === 'RENT'
                  ? 'bg-white text-slate-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Inchiriere
            </button>
            <button
              type="button"
              onClick={() => setRequestType('SALE')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                requestType === 'SALE'
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
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="req-company" className="label mb-0">
              Client <span className="text-red-400">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowNewCompany(!showNewCompany)}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              {showNewCompany ? 'Selecteaza existenta' : 'Companie noua'}
            </button>
          </div>
          {showNewCompany ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="input flex-1"
                placeholder="Nume companie noua"
              />
              <button
                type="button"
                onClick={handleCreateCompany}
                disabled={creatingCompany || !newCompanyName.trim()}
                className="btn-primary text-xs px-3 py-2 shrink-0"
              >
                {creatingCompany ? '...' : 'Adauga'}
              </button>
            </div>
          ) : (
            <select
              id="req-company"
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setPersonId('');
              }}
              className="input"
            >
              <option value="">-- Selecteaza --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Person */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="req-person" className="label mb-0">
              Persoana contact <span className="text-red-400">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowNewPerson(!showNewPerson)}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              {showNewPerson ? 'Selecteaza existenta' : 'Persoana noua'}
            </button>
          </div>
          {showNewPerson ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                className="input"
                placeholder="Nume persoana *"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="email"
                  value={newPersonEmail}
                  onChange={(e) => setNewPersonEmail(e.target.value)}
                  className="input"
                  placeholder="Email"
                />
                <input
                  type="tel"
                  value={newPersonPhone}
                  onChange={(e) => setNewPersonPhone(e.target.value)}
                  className="input"
                  placeholder="Telefon"
                />
              </div>
              <button
                type="button"
                onClick={handleCreatePerson}
                disabled={creatingPerson || !newPersonName.trim()}
                className="btn-primary text-xs px-3 py-2"
              >
                {creatingPerson ? 'Se creeaza...' : 'Adauga persoana'}
              </button>
            </div>
          ) : (
            <select
              id="req-person"
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="input"
            >
              <option value="">-- Selecteaza --</option>
              {filteredPersons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Matching criteria */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Criterii cautare
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="req-sqm" className="label">
                Suprafata (mp)
              </label>
              <input
                id="req-sqm"
                type="number"
                value={numberOfSqm}
                onChange={(e) => setNumberOfSqm(e.target.value)}
                className="input"
                placeholder="ex: 5000"
                min={0}
              />
            </div>
            <div>
              <label htmlFor="req-height" className="label">
                Inaltime minima (m)
              </label>
              <input
                id="req-height"
                type="number"
                value={minHeight}
                onChange={(e) => setMinHeight(e.target.value)}
                className="input"
                placeholder="optional"
                min={0}
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* Location selection: list or map circle */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0">Zona</label>
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setLocationMode('map')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  locationMode === 'map'
                    ? 'bg-white text-slate-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <MapPin className="w-3 h-3" />
                Harta
              </button>
              <button
                type="button"
                onClick={() => setLocationMode('list')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  locationMode === 'list'
                    ? 'bg-white text-slate-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List className="w-3 h-3" />
                Orase
              </button>
            </div>
          </div>

          {locationMode === 'list' && locations.length > 0 && (
            <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
              {locations.map((loc) => (
                <label
                  key={loc.id}
                  className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedLocationIds.includes(loc.id)}
                    onChange={() => toggleLocation(loc.id)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>
                    {loc.name} ({loc.county})
                  </span>
                </label>
              ))}
            </div>
          )}

          {locationMode === 'map' && (
            <div className="space-y-2">
              <Suspense
                fallback={
                  <div className="h-[200px] sm:h-[240px] bg-slate-100 rounded-lg flex items-center justify-center">
                    <span className="inline-block w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  </div>
                }
              >
                <CirclePickerMap
                  center={searchCenter}
                  radiusKm={searchRadius}
                  onCenterChange={(lat, lng) => setSearchCenter({ lat, lng })}
                  className="h-[200px] sm:h-[240px]"
                />
              </Suspense>

              {/* Radius slider */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-500 whitespace-nowrap">Raza:</label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(Number(e.target.value))}
                  className="flex-1 h-2 sm:h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary-600"
                />
                <span className="text-sm sm:text-xs font-medium text-slate-700 w-14 sm:w-12 text-right">
                  {searchRadius} km
                </span>
              </div>

              {searchCenter && (
                <button
                  type="button"
                  onClick={() => setSearchCenter(null)}
                  className="text-xs text-red-500 hover:text-red-600 font-medium"
                >
                  Sterge zona
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose} className="btn-secondary">
            Anuleaza
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            <span>{submitting ? 'Se salveaza...' : 'Cauta proprietati'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
