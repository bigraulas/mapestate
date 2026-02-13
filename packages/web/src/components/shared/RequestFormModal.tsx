import { useState, useEffect, type FormEvent } from 'react';
import Modal from '@/components/shared/Modal';
import { requestsService } from '@/services/requests.service';
import { companiesService } from '@/services/companies.service';
import { personsService } from '@/services/persons.service';
import { locationsService } from '@/services/locations.service';

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
  const [name, setName] = useState('');
  const [numberOfSqm, setNumberOfSqm] = useState('');
  const [estimatedFeeValue, setEstimatedFeeValue] = useState('');
  const [contractPeriod, setContractPeriod] = useState('');
  const [requestType, setRequestType] = useState('RENT');
  const [startDate, setStartDate] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [personId, setPersonId] = useState('');
  const [selectedLocationIds, setSelectedLocationIds] = useState<number[]>([]);
  const [notes, setNotes] = useState('');

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
          companiesService.getAll(1, 500),
          personsService.getAll(1, 500),
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

  const resetForm = () => {
    setName('');
    setNumberOfSqm('');
    setEstimatedFeeValue('');
    setContractPeriod('');
    setRequestType('RENT');
    setStartDate('');
    setCompanyId('');
    setPersonId('');
    setSelectedLocationIds([]);
    setNotes('');
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        name,
        requestType,
      };

      if (numberOfSqm) payload.numberOfSqm = Number(numberOfSqm);
      if (estimatedFeeValue) payload.estimatedFeeValue = Number(estimatedFeeValue);
      if (contractPeriod) payload.contractPeriod = Number(contractPeriod);
      if (startDate) payload.startDate = startDate;
      if (companyId) payload.companyId = Number(companyId);
      if (personId) payload.personId = Number(personId);
      if (selectedLocationIds.length > 0) payload.locationIds = selectedLocationIds;
      if (notes) payload.notes = notes;

      await requestsService.create(payload);
      resetForm();
      onSuccess();
      onClose();
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Adauga cerere noua">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="req-name" className="label">
            Nume cerere *
          </label>
          <input
            id="req-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Ex: Depozit logistic Bucuresti"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
              placeholder="0"
              min={0}
            />
          </div>
          <div>
            <label htmlFor="req-fee" className="label">
              Fee Estimat (EUR)
            </label>
            <input
              id="req-fee"
              type="number"
              value={estimatedFeeValue}
              onChange={(e) => setEstimatedFeeValue(e.target.value)}
              className="input"
              placeholder="0"
              min={0}
              step="0.01"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="req-period" className="label">
              Perioada contract (luni)
            </label>
            <input
              id="req-period"
              type="number"
              value={contractPeriod}
              onChange={(e) => setContractPeriod(e.target.value)}
              className="input"
              placeholder="0"
              min={0}
            />
          </div>
          <div>
            <label htmlFor="req-type" className="label">
              Tip cerere
            </label>
            <select
              id="req-type"
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="input"
            >
              <option value="RENT">Inchiriere</option>
              <option value="SALE">Vanzare</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="req-start" className="label">
            Data start
          </label>
          <input
            id="req-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="req-company" className="label">
              Companie
            </label>
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
          </div>
          <div>
            <label htmlFor="req-person" className="label">
              Persoana contact
            </label>
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
          </div>
        </div>

        {locations.length > 0 && (
          <div>
            <label className="label">Locatii</label>
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
          </div>
        )}

        <div>
          <label htmlFor="req-notes" className="label">
            Notite
          </label>
          <textarea
            id="req-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
            rows={3}
            placeholder="Detalii suplimentare..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose} className="btn-secondary">
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
  );
}
