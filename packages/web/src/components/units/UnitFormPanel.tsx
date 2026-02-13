import { useState, useEffect, type FormEvent } from 'react';
import { X, Save, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Unit } from '@dunwell/shared';
import { unitsService } from '@/services';
import FileUpload from '@/components/shared/FileUpload';

interface UnitFormPanelProps {
  buildingId: number;
  unit?: Unit | null;
  onClose: () => void;
  onSaved: () => void;
}

interface UnitForm {
  name: string;
  usefulHeight: string;
  hasOffice: boolean;
  officeSqm: string;
  hasSanitary: boolean;
  warehousePrice: string;
  officePrice: string;
  maintenancePrice: string;
  docks: string;
  driveins: string;
  crossDock: boolean;
  floorPlan: string[];
  photos: string[];
}

function unitToForm(u?: Unit | null): UnitForm {
  if (!u) {
    return {
      name: '',
      usefulHeight: '',
      hasOffice: false,
      officeSqm: '',
      hasSanitary: false,
      warehousePrice: '',
      officePrice: '',
      maintenancePrice: '',
      docks: '',
      driveins: '',
      crossDock: false,
      floorPlan: [],
      photos: [],
    };
  }
  return {
    name: u.name,
    usefulHeight: u.usefulHeight?.toString() ?? '',
    hasOffice: u.hasOffice ?? false,
    officeSqm: u.officeSqm?.toString() ?? '',
    hasSanitary: u.hasSanitary ?? false,
    warehousePrice: u.warehousePrice?.toString() ?? '',
    officePrice: u.officePrice?.toString() ?? '',
    maintenancePrice: u.maintenancePrice?.toString() ?? '',
    docks: u.docks?.toString() ?? '',
    driveins: u.driveins?.toString() ?? '',
    crossDock: u.crossDock ?? false,
    floorPlan: u.floorPlan ? [u.floorPlan] : [],
    photos: Array.isArray(u.photos) ? (u.photos as string[]) : [],
  };
}

export default function UnitFormPanel({ buildingId, unit, onClose, onSaved }: UnitFormPanelProps) {
  const isEditing = !!unit;
  const [form, setForm] = useState<UnitForm>(unitToForm(unit));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showAccess, setShowAccess] = useState(false);

  useEffect(() => {
    setForm(unitToForm(unit));
  }, [unit]);

  const update = <K extends keyof UnitForm>(key: K, val: UnitForm[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  const buildPayload = () => ({
    name: form.name,
    buildingId,
    usefulHeight: form.usefulHeight ? parseFloat(form.usefulHeight) : undefined,
    hasOffice: form.hasOffice,
    officeSqm: form.officeSqm ? parseFloat(form.officeSqm) : undefined,
    hasSanitary: form.hasSanitary,
    warehousePrice: form.warehousePrice ? parseFloat(form.warehousePrice) : undefined,
    officePrice: form.officePrice ? parseFloat(form.officePrice) : undefined,
    maintenancePrice: form.maintenancePrice ? parseFloat(form.maintenancePrice) : undefined,
    docks: form.docks ? parseInt(form.docks, 10) : undefined,
    driveins: form.driveins ? parseInt(form.driveins, 10) : undefined,
    crossDock: form.crossDock,
    floorPlan: form.floorPlan[0] || undefined,
    photos: form.photos.length > 0 ? form.photos : undefined,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    setError('');
    setSubmitting(true);
    try {
      if (isEditing) {
        await unitsService.update(unit!.id, buildPayload());
      } else {
        await unitsService.create(buildPayload());
      }
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'Eroare la salvarea unitatii.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!unit || !confirm('Stergi acest spatiu?')) return;
    setDeleting(true);
    try {
      await unitsService.delete(unit.id);
      onSaved();
    } catch {
      setError('Eroare la stergerea unitatii.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEditing ? 'Editeaza spatiu' : 'Adauga spatiu'}
          </h2>
          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Sterge spatiu"
              >
                {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Name + Height */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nume spatiu *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="input"
                placeholder="ex: Hala A1"
                required
              />
            </div>
            <div>
              <label className="label">Inaltime utila (m)</label>
              <input
                type="number"
                value={form.usefulHeight}
                onChange={(e) => update('usefulHeight', e.target.value)}
                className="input"
                placeholder="0"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          {/* Office + Sanitary toggles inline */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasOffice}
                onChange={(e) => update('hasOffice', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">Are birou</span>
            </label>
            {form.hasOffice && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={form.officeSqm}
                  onChange={(e) => update('officeSqm', e.target.value)}
                  className="input !w-20 !py-1 text-sm"
                  placeholder="mp"
                  min="0"
                />
                <span className="text-xs text-slate-400">mp</span>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasSanitary}
                onChange={(e) => update('hasSanitary', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">Grup sanitar</span>
            </label>
          </div>

          {/* Prices */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Preturi (EUR/mp/luna)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Hala</label>
                <input
                  type="number"
                  value={form.warehousePrice}
                  onChange={(e) => update('warehousePrice', e.target.value)}
                  className="input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="label">Birou</label>
                <input
                  type="number"
                  value={form.officePrice}
                  onChange={(e) => update('officePrice', e.target.value)}
                  className="input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="label">Mentenanta</label>
                <input
                  type="number"
                  value={form.maintenancePrice}
                  onChange={(e) => update('maintenancePrice', e.target.value)}
                  className="input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Access - collapsible */}
          <div>
            <button
              type="button"
              onClick={() => setShowAccess(!showAccess)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
            >
              {showAccess ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Acces (docks, drive-ins)
            </button>
            {showAccess && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Docks</label>
                  <input
                    type="number"
                    value={form.docks}
                    onChange={(e) => update('docks', e.target.value)}
                    className="input"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Drive-ins</label>
                  <input
                    type="number"
                    value={form.driveins}
                    onChange={(e) => update('driveins', e.target.value)}
                    className="input"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer self-end pb-2">
                  <input
                    type="checkbox"
                    checked={form.crossDock}
                    onChange={(e) => update('crossDock', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700">Cross-dock</span>
                </label>
              </div>
            )}
          </div>

          {/* Floor plan upload */}
          <FileUpload
            label="Schita (floor plan)"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            value={form.floorPlan}
            onUpload={(urls) => update('floorPlan', urls)}
          />

          {/* Photos upload */}
          <FileUpload
            label="Poze"
            multiple
            accept="image/jpeg,image/png,image/webp"
            value={form.photos}
            onUpload={(urls) => update('photos', urls)}
          />

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !form.name}
              className="btn-primary w-full justify-center"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{submitting ? 'Se salveaza...' : isEditing ? 'Salveaza modificarile' : 'Salveaza spatiu'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
