import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { X, Save, Loader2, Search, MapPin } from 'lucide-react';
import type { Location } from '@dunwell/shared';
import { TransactionType } from '@dunwell/shared';
import type { DiscoveredMarker } from '@/components/map/MapboxMap';
import { discoverService, locationsService } from '@/services';

interface ImportPropertyModalProps {
  property: DiscoveredMarker;
  onClose: () => void;
  onImported: (buildingId: number) => void;
}

export default function ImportPropertyModal({
  property,
  onClose,
  onImported,
}: ImportPropertyModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Location search
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [showLocDropdown, setShowLocDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Form fields
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.RENT);
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  // Auto-search location from city/county
  useEffect(() => {
    const q = property.city || property.county || '';
    if (q.length >= 2) {
      setLocationSearch(q);
    }
  }, [property.city, property.county]);

  const searchLocations = useCallback(async (q: string) => {
    if (q.length < 2) {
      setLocations([]);
      return;
    }
    try {
      const res = await locationsService.search(q);
      setLocations(res.data);
    } catch {
      setLocations([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchLocations(locationSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [locationSearch, searchLocations]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) return;

    setError('');
    setSubmitting(true);
    try {
      const res = await discoverService.importProperty({
        osmId: property.osmId,
        name: property.name,
        lat: property.lat,
        lng: property.lng,
        type: property.type,
        address: property.address,
        city: property.city,
        county: property.county,
        operator: property.operator,
        sqm: property.sqm,
        locationId: selectedLocation.id,
        transactionType,
        ownerName: ownerName || undefined,
        ownerPhone: ownerPhone || undefined,
      });
      onImported(res.data.id);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'Eroare la import.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Importa in CRM</h2>
            <p className="text-xs text-slate-400 mt-0.5">Din OpenStreetMap</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Pre-filled info */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
            <p className="text-sm font-medium text-slate-900">{property.name}</p>
            {property.address && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {property.address}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {property.city && (
                <span className="text-xs text-slate-400">{property.city}</span>
              )}
              {property.sqm && (
                <span className="badge text-xs bg-blue-50 text-blue-600">
                  ~{Math.round(property.sqm).toLocaleString('ro-RO')} mp
                </span>
              )}
            </div>
          </div>

          {/* Location search */}
          <div className="relative">
            <label className="label">Locatie *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={showLocDropdown ? locationSearch : (selectedLocation ? `${selectedLocation.name}, ${selectedLocation.county}` : locationSearch)}
                onChange={(e) => {
                  setLocationSearch(e.target.value);
                  setShowLocDropdown(true);
                  setSelectedLocation(null);
                }}
                onFocus={() => {
                  setShowLocDropdown(true);
                  if (selectedLocation) setLocationSearch('');
                }}
                className="input !pl-9"
                placeholder="Cauta locatie..."
              />
            </div>
            {showLocDropdown && locations.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      setSelectedLocation(loc);
                      setShowLocDropdown(false);
                      setLocationSearch('');
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium">{loc.name}</span>
                    <span className="text-slate-400 ml-1">, {loc.county}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Transaction type */}
          <div>
            <label className="label">Tip tranzactie</label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as TransactionType)}
              className="input"
            >
              <option value={TransactionType.RENT}>Inchiriere</option>
              <option value={TransactionType.SALE}>Vanzare</option>
            </select>
          </div>

          {/* Owner (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Proprietar</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="input"
                placeholder="Nume proprietar"
              />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input
                type="text"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                className="input"
                placeholder="+40..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Anuleaza
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedLocation}
              className="btn-primary flex-1 justify-center"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{submitting ? 'Se importa...' : 'Importa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
