import { useState, useRef, type FormEvent } from 'react';
import { Save, Loader2, X, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { unitsService } from '@/services';

interface UnitQuickAddProps {
  buildingId: number;
  onSaved: (openDetails?: boolean) => void;
  onCancel: () => void;
}

interface QuickAddForm {
  name: string;
  usefulHeight: string;
  warehousePrice: string;
  officePrice: string;
  maintenancePrice: string;
  salePrice: string;
  salePriceVatIncluded: boolean;
  docks: string;
  driveins: string;
  crossDock: boolean;
  hasOffice: boolean;
  officeSqm: string;
  hasSanitary: boolean;
}

const emptyForm: QuickAddForm = {
  name: '',
  usefulHeight: '',
  warehousePrice: '',
  officePrice: '',
  maintenancePrice: '',
  salePrice: '',
  salePriceVatIncluded: false,
  docks: '',
  driveins: '',
  crossDock: false,
  hasOffice: false,
  officeSqm: '',
  hasSanitary: false,
};

function parseNum(val: string): number | undefined {
  if (!val) return undefined;
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}

function parseInt10(val: string): number | undefined {
  if (!val) return undefined;
  const n = parseInt(val, 10);
  return isNaN(n) ? undefined : n;
}

export default function UnitQuickAdd({ buildingId, onSaved, onCancel }: UnitQuickAddProps) {
  const [form, setForm] = useState<QuickAddForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof QuickAddForm>(key: K, val: QuickAddForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const buildPayload = () => ({
    name: form.name,
    buildingId,
    usefulHeight: parseNum(form.usefulHeight),
    warehousePrice: parseNum(form.warehousePrice),
    officePrice: parseNum(form.officePrice),
    maintenancePrice: parseNum(form.maintenancePrice),
    salePrice: parseNum(form.salePrice),
    salePriceVatIncluded: form.salePriceVatIncluded,
    docks: parseInt10(form.docks),
    driveins: parseInt10(form.driveins),
    crossDock: form.crossDock,
    hasOffice: form.hasOffice,
    officeSqm: parseNum(form.officeSqm),
    hasSanitary: form.hasSanitary,
  });

  const save = async (openDetails: boolean) => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await unitsService.create(buildPayload());
      toast.success('Spatiu creat cu succes');
      setForm(emptyForm);
      if (openDetails) {
        onSaved(true);
      } else {
        onSaved();
        // Re-focus name input for rapid consecutive entry
        setTimeout(() => nameRef.current?.focus(), 0);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'Eroare la crearea spatiului.';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    save(false);
  };

  const labelClass = 'text-[11px] font-medium text-slate-500 uppercase tracking-wider';
  const checkboxClass = 'w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500';

  return (
    <form
      onSubmit={handleSubmit}
      className="px-5 py-4 bg-primary-50/50 border-t border-primary-100"
    >
      {/* Row 1: Name + Height */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <label className={labelClass}>Nume spatiu *</label>
          <input
            ref={nameRef}
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="input"
            placeholder="ex: Hala A1"
            required
            autoFocus
          />
        </div>
        <div className="w-[100px]">
          <label className={labelClass}>Inaltime (m)</label>
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

      {/* Row 2: Rent prices */}
      <div className="mb-3">
        <label className={labelClass}>Preturi inchiriere (EUR/mp/luna)</label>
        <div className="grid grid-cols-3 gap-3 mt-1">
          <input
            type="number"
            value={form.warehousePrice}
            onChange={(e) => update('warehousePrice', e.target.value)}
            className="input"
            placeholder="Hala"
            min="0"
            step="0.01"
          />
          <input
            type="number"
            value={form.officePrice}
            onChange={(e) => update('officePrice', e.target.value)}
            className="input"
            placeholder="Birou"
            min="0"
            step="0.01"
          />
          <input
            type="number"
            value={form.maintenancePrice}
            onChange={(e) => update('maintenancePrice', e.target.value)}
            className="input"
            placeholder="Mentenanta"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Row 3: Sale price + VAT checkbox */}
      <div className="flex items-end gap-3 mb-3">
        <div className="w-48">
          <label className={labelClass}>Pret vanzare (EUR)</label>
          <input
            type="number"
            value={form.salePrice}
            onChange={(e) => update('salePrice', e.target.value)}
            className="input"
            placeholder="0"
            min="0"
            step="1"
          />
        </div>
        <label className="flex items-center gap-1.5 pb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.salePriceVatIncluded}
            onChange={(e) => update('salePriceVatIncluded', e.target.checked)}
            className={checkboxClass}
          />
          <span className="text-xs text-slate-600">incl. TVA</span>
        </label>
      </div>

      {/* Row 4: Access + Features */}
      <div className="flex items-end gap-3 flex-wrap mb-4">
        <div className="w-20">
          <label className={labelClass}>Docks</label>
          <input
            type="number"
            value={form.docks}
            onChange={(e) => update('docks', e.target.value)}
            className="input"
            placeholder="0"
            min="0"
          />
        </div>
        <div className="w-20">
          <label className={labelClass}>Drive-ins</label>
          <input
            type="number"
            value={form.driveins}
            onChange={(e) => update('driveins', e.target.value)}
            className="input"
            placeholder="0"
            min="0"
          />
        </div>
        <label className="flex items-center gap-1.5 pb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.crossDock}
            onChange={(e) => update('crossDock', e.target.checked)}
            className={checkboxClass}
          />
          <span className="text-xs text-slate-600">Cross-dock</span>
        </label>
        <label className="flex items-center gap-1.5 pb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.hasOffice}
            onChange={(e) => update('hasOffice', e.target.checked)}
            className={checkboxClass}
          />
          <span className="text-xs text-slate-600">Birou</span>
        </label>
        {form.hasOffice && (
          <div className="w-20">
            <label className={labelClass}>mp</label>
            <input
              type="number"
              value={form.officeSqm}
              onChange={(e) => update('officeSqm', e.target.value)}
              className="input"
              placeholder="mp"
              min="0"
            />
          </div>
        )}
        <label className="flex items-center gap-1.5 pb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.hasSanitary}
            onChange={(e) => update('hasSanitary', e.target.checked)}
            className={checkboxClass}
          />
          <span className="text-xs text-slate-600">Sanitar</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || !form.name.trim()}
          className="btn-primary !py-1.5 !px-3 !text-xs"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>Salveaza</span>
        </button>
        <button
          type="button"
          disabled={submitting || !form.name.trim()}
          onClick={() => save(true)}
          className="btn-secondary !py-1.5 !px-3 !text-xs"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Detalii</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary !py-1.5 !px-3 !text-xs"
        >
          <X className="w-3.5 h-3.5" />
          <span>Anuleaza</span>
        </button>
      </div>
    </form>
  );
}
