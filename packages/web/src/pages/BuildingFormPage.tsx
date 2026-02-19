import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Building2,
  ChevronLeft,
  Save,
  Loader2,
  Search,
  MapPin,
  Crosshair,
  Plus,
} from 'lucide-react';
import type { Building, Company } from '@mapestate/shared';
import { buildingsService, companiesService, personsService } from '@/services';
import { MapboxMap } from '@/components/map';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface GeoFeature {
  place_name: string;
  center: [number, number];
}

async function searchAddress(query: string): Promise<GeoFeature[]> {
  try {
    const q = encodeURIComponent(query);
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${q}&access_token=${MAPBOX_TOKEN}&limit=5&country=RO&language=ro`;
    const res = await fetch(url);
    const data = await res.json();
    return (data.features ?? []).map((f: Record<string, unknown>) => ({
      place_name: (f.properties as Record<string, string>)?.full_address || (f.properties as Record<string, string>)?.name || '',
      center: (f.geometry as { coordinates: [number, number] }).coordinates,
    }));
  } catch {
    return [];
  }
}

async function reverseGeocode(lng: number, lat: number): Promise<string | null> {
  try {
    const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&access_token=${MAPBOX_TOKEN}&limit=1&language=ro`;
    const res = await fetch(url);
    const data = await res.json();
    const feat = data.features?.[0];
    return feat?.properties?.full_address || feat?.properties?.name || null;
  } catch {
    return null;
  }
}

interface FormData {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  propertyType: 'individual' | 'developer';
  developerId: string; // existing company id, or '__new__' for inline creation
  // Inline new developer fields
  newDevName: string;
  newDevVatNumber: string;
  newDevJNumber: string;
  newDevAddress: string;
}

const INITIAL_FORM: FormData = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  ownerName: '',
  ownerPhone: '',
  ownerEmail: '',
  propertyType: 'individual',
  developerId: '',
  newDevName: '',
  newDevVatNumber: '',
  newDevJNumber: '',
  newDevAddress: '',
};

export default function BuildingFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditing = !!id;

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingBuilding, setLoadingBuilding] = useState(false);
  const [showMap, setShowMap] = useState(true);

  // Developer companies
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // CUI lookup for inline new developer
  const [cuiInput, setCuiInput] = useState('');
  const [lookingUpCui, setLookingUpCui] = useState(false);
  const [cuiAutoFilled, setCuiAutoFilled] = useState(false);

  // Address autocomplete
  const [suggestions, setSuggestions] = useState<GeoFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Map
  const [flyTo, setFlyTo] = useState<{ lng: number; lat: number; zoom?: number } | null>(null);

  // Load companies for developer selector
  useEffect(() => {
    if (form.propertyType !== 'developer' || companies.length > 0) return;
    setLoadingCompanies(true);
    companiesService
      .getAll({ page: 1, limit: 200 })
      .then((res) => {
        const data = res.data?.data ?? res.data ?? [];
        setCompanies(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoadingCompanies(false));
  }, [form.propertyType, companies.length]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addressRef.current && !addressRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Pre-fill from search params (legacy)
  useEffect(() => {
    if (isEditing) return;
    const name = searchParams.get('name');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const address = searchParams.get('address');

    if (name) {
      setForm((p) => ({
        ...p,
        name: name || p.name,
        latitude: lat || p.latitude,
        longitude: lng || p.longitude,
        address: address || p.address,
      }));
      if (lat && lng) setShowMap(false);
    }
  }, [isEditing, searchParams]);

  // Load existing building for editing
  useEffect(() => {
    if (!id) return;
    setLoadingBuilding(true);
    buildingsService
      .getById(parseInt(id, 10))
      .then((res) => {
        const b: Building = res.data;
        setForm({
          name: b.name,
          address: b.address ?? '',
          latitude: b.latitude?.toString() ?? '',
          longitude: b.longitude?.toString() ?? '',
          ownerName: b.ownerName ?? '',
          ownerPhone: b.ownerPhone ?? '',
          ownerEmail: b.ownerEmail ?? '',
          propertyType: b.developerId ? 'developer' : 'individual',
          developerId: b.developerId?.toString() ?? '',
          newDevName: '',
          newDevVatNumber: '',
          newDevJNumber: '',
          newDevAddress: '',
        });
      })
      .catch(() => setError('Nu s-a putut incarca proprietatea.'))
      .finally(() => setLoadingBuilding(false));
  }, [id]);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddressChange = (value: string) => {
    updateField('address', value);
    clearTimeout(debounceRef.current);
    if (value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await searchAddress(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
  };

  const handleSuggestionSelect = (feat: GeoFeature) => {
    updateField('address', feat.place_name);
    updateField('latitude', feat.center[1].toFixed(6));
    updateField('longitude', feat.center[0].toFixed(6));
    setSuggestions([]);
    setShowSuggestions(false);
    setShowMap(true);
    setFlyTo({ lng: feat.center[0], lat: feat.center[1], zoom: 17 });
  };

  const handleCoordinatePick = async (lng: number, lat: number) => {
    updateField('latitude', lat.toFixed(6));
    updateField('longitude', lng.toFixed(6));
    const address = await reverseGeocode(lng, lat);
    if (address) {
      updateField('address', address);
    }
  };

  const handleLookupCui = async () => {
    const cui = cuiInput.replace(/\D/g, '');
    if (!cui) return;
    setLookingUpCui(true);
    setCuiAutoFilled(false);
    try {
      const res = await companiesService.lookupCui(cui);
      const data = res.data;
      if (data?.name) {
        setForm((prev) => ({
          ...prev,
          newDevName: data.name ?? '',
          newDevAddress: data.address ?? '',
          newDevJNumber: data.jNumber ?? '',
          newDevVatNumber: data.vatNumber ?? '',
        }));
        setCuiAutoFilled(true);
        setTimeout(() => setCuiAutoFilled(false), 2000);
      }
    } catch { /* ignore */ }
    setLookingUpCui(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      let developerId: number | null = null;

      if (form.propertyType === 'developer') {
        if (form.developerId === '__new__') {
          // Create new developer company first
          if (!form.newDevName.trim()) {
            setError('Numele developerului este obligatoriu.');
            setSubmitting(false);
            return;
          }
          const companyRes = await companiesService.create({
            name: form.newDevName,
            vatNumber: form.newDevVatNumber || undefined,
            jNumber: form.newDevJNumber || undefined,
            address: form.newDevAddress || undefined,
          });
          developerId = companyRes.data.id;
        } else if (form.developerId) {
          developerId = parseInt(form.developerId, 10);
        }
      } else {
        // Individual — create a company with the individual's name
        if (form.ownerName.trim()) {
          const companyRes = await companiesService.create({
            name: form.ownerName,
          });
          developerId = companyRes.data.id;

          // Create a person linked to this company
          const phones = form.ownerPhone ? [form.ownerPhone] : [];
          const emails = form.ownerEmail ? [form.ownerEmail] : [];
          if (phones.length > 0 || emails.length > 0) {
            await personsService.create({
              name: form.ownerName,
              companyId: developerId,
              phones,
              emails,
            });
          }
        }
      }

      const payload: Record<string, unknown> = {
        name: form.name,
        address: form.address || undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        ownerName: form.ownerName || undefined,
        ownerPhone: form.ownerPhone || undefined,
        ownerEmail: form.ownerEmail || undefined,
        developerId,
      };

      let buildingId: number;
      if (isEditing) {
        const res = await buildingsService.update(parseInt(id, 10), payload);
        buildingId = res.data.id;
      } else {
        const res = await buildingsService.create(payload);
        buildingId = res.data.id;
      }
      navigate(`/proprietati/${buildingId}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'Eroare la salvarea proprietatii.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingBuilding) {
    return (
      <div className="page-container flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Se incarca...</span>
      </div>
    );
  }

  return (
    <div className="page-container max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(isEditing ? `/proprietati/${id}` : '/proprietati')}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Building2 className="w-6 h-6 text-primary-600" />
        <h1 className="page-title">
          {isEditing ? 'Editeaza proprietate' : 'Proprietate noua'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Main info */}
        <div className="card card-body space-y-4">
          <div>
            <label className="label">Nume proprietate *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="input"
              placeholder="ex: Hala Centura Nord"
              required
            />
          </div>

          {/* Address with autocomplete */}
          <div ref={addressRef} className="relative">
            <label className="label">Adresa</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleAddressChange(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                className="input !pl-9"
                placeholder="Cauta adresa, comuna, oras..."
              />
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {suggestions.map((feat, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSuggestionSelect(feat)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors flex items-start gap-2"
                  >
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">{feat.place_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Owner */}
        <div className="card card-body space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Proprietar</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Nume</label>
              <input
                type="text"
                value={form.ownerName}
                onChange={(e) => updateField('ownerName', e.target.value)}
                className="input"
                placeholder="Nume complet"
              />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input
                type="text"
                value={form.ownerPhone}
                onChange={(e) => updateField('ownerPhone', e.target.value)}
                className="input"
                placeholder="+40..."
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={form.ownerEmail}
                onChange={(e) => updateField('ownerEmail', e.target.value)}
                className="input"
                placeholder="email@ex.ro"
              />
            </div>
          </div>
        </div>

        {/* Property Type */}
        <div className="card card-body space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Tip proprietate</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="propertyType"
                value="individual"
                checked={form.propertyType === 'individual'}
                onChange={() => updateField('propertyType', 'individual')}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">Individual</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="propertyType"
                value="developer"
                checked={form.propertyType === 'developer'}
                onChange={() => updateField('propertyType', 'developer')}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">Developer</span>
            </label>
          </div>
          {form.propertyType === 'developer' && (
            <div className="space-y-4">
              <div>
                <label className="label">Developer (companie)</label>
                {loadingCompanies ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Se incarca...
                  </div>
                ) : (
                  <select
                    value={form.developerId}
                    onChange={(e) => updateField('developerId', e.target.value)}
                    className="input"
                  >
                    <option value="">Selecteaza developer...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__new__">+ Developer nou</option>
                  </select>
                )}
              </div>

              {/* Inline new developer form */}
              {form.developerId === '__new__' && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">Developer nou</span>
                  </div>

                  {/* CUI lookup */}
                  <div>
                    <label className="label !text-blue-900">CUI (completare automata ANAF)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cuiInput}
                        onChange={(e) => setCuiInput(e.target.value.replace(/\s/g, ''))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookupCui(); } }}
                        className="input flex-1 !bg-white font-mono"
                        placeholder="ex: 12345678"
                      />
                      <button
                        type="button"
                        onClick={handleLookupCui}
                        disabled={lookingUpCui}
                        className="btn-primary shrink-0 !px-4"
                      >
                        {lookingUpCui ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        <span>{lookingUpCui ? 'Se cauta...' : 'Cauta'}</span>
                      </button>
                    </div>
                  </div>

                  <div className={`space-y-3 transition-all duration-500 ${cuiAutoFilled ? 'ring-2 ring-green-300 rounded-lg p-3 bg-green-50/50' : ''}`}>
                    <div>
                      <label className="label">Nume developer *</label>
                      <input
                        type="text"
                        value={form.newDevName}
                        onChange={(e) => updateField('newDevName', e.target.value.toUpperCase())}
                        className="input uppercase"
                        placeholder="NUMELE COMPANIEI"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="label">CUI / Cod fiscal</label>
                        <input
                          type="text"
                          value={form.newDevVatNumber}
                          onChange={(e) => updateField('newDevVatNumber', e.target.value.toUpperCase())}
                          className="input uppercase"
                          placeholder="RO12345678"
                        />
                      </div>
                      <div>
                        <label className="label">Nr. Registru</label>
                        <input
                          type="text"
                          value={form.newDevJNumber}
                          onChange={(e) => updateField('newDevJNumber', e.target.value)}
                          className="input"
                          placeholder="J40/123/2024"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Adresa sediu</label>
                      <input
                        type="text"
                        value={form.newDevAddress}
                        onChange={(e) => updateField('newDevAddress', e.target.value)}
                        className="input"
                        placeholder="Adresa sediului social"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-500" />
              Locatie pe harta
              {form.latitude && form.longitude && (
                <span className="text-xs text-emerald-500 font-normal ml-1">Setat</span>
              )}
            </h3>
            <span className="text-xs text-slate-400">{showMap ? 'Ascunde' : 'Arata'}</span>
          </button>

          {showMap && (
            <div className="px-5 pb-5 space-y-3">
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm" style={{ height: '350px' }}>
                <MapboxMap
                  buildings={[]}
                  pickMode={true}
                  flyTo={flyTo}
                  onCoordinatePick={handleCoordinatePick}
                  markerPosition={
                    form.latitude && form.longitude
                      ? { lng: parseFloat(form.longitude), lat: parseFloat(form.latitude) }
                      : null
                  }
                />
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Crosshair className="w-3 h-3" />
                Cauta o adresa mai sus sau click direct pe harta
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(isEditing ? `/proprietati/${id}` : '/proprietati')}
            className="btn-secondary"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Inapoi</span>
          </button>

          <button
            type="submit"
            disabled={submitting || !form.name}
            className="btn-primary"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{submitting ? 'Se salveaza...' : 'Salveaza'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
