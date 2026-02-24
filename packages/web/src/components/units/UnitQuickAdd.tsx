import { useState, useRef, useCallback, type FormEvent } from 'react';
import { Save, Loader2, X, Settings, FileImage, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { unitsService, uploadsService } from '@/services';

interface UnitQuickAddProps {
  buildingId: number;
  onSaved: (openDetails?: boolean) => void;
  onCancel: () => void;
}

interface QuickAddForm {
  name: string;
  sqm: string;
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
  floorPlan: string[];
  photos: string[];
}

const emptyForm: QuickAddForm = {
  name: '',
  sqm: '',
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
  floorPlan: [],
  photos: [],
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
  const [uploadingField, setUploadingField] = useState<'floorPlan' | 'photos' | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const floorPlanRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof QuickAddForm>(key: K, val: QuickAddForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const buildPayload = () => ({
    name: form.name,
    buildingId,
    warehouseSpace: form.sqm ? { sqm: parseFloat(form.sqm), rentPrice: form.warehousePrice ? parseFloat(form.warehousePrice) : 0 } : undefined,
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
    floorPlan: form.floorPlan[0] || undefined,
    photos: form.photos.length > 0 ? form.photos : undefined,
  });

  const handleUpload = useCallback(async (files: FileList, field: 'floorPlan' | 'photos') => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;
    setUploadingField(field);
    try {
      const urls: string[] = [];
      for (const file of fileArr) {
        const res = await uploadsService.upload(file);
        urls.push(res.data.url);
      }
      setForm((prev) => ({
        ...prev,
        [field]: field === 'photos' ? [...prev.photos, ...urls] : urls.slice(0, 1),
      }));
    } catch {
      toast.error('Eroare la upload');
    } finally {
      setUploadingField(null);
    }
  }, []);

  const removeFile = (field: 'floorPlan' | 'photos', url: string) => {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((u) => u !== url) }));
  };

  const save = async (openDetails: boolean) => {
    if (!form.name.trim() || !form.sqm || !form.warehousePrice) return;
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
      {/* Row 1: Name + Sqm + Height */}
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
          <label className={labelClass}>Suprafata (mp) *</label>
          <input
            type="number"
            value={form.sqm}
            onChange={(e) => update('sqm', e.target.value)}
            className="input"
            placeholder="0"
            min="0"
            step="1"
            required
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
            placeholder="Spatiu *"
            min="0"
            step="0.01"
            required
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
      </div>

      {/* Row 5: Uploads - subtle inline */}
      <div className="flex items-center gap-3 mb-4">
        {/* Floor plan */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => floorPlanRef.current?.click()}
            disabled={uploadingField === 'floorPlan'}
            className="flex items-center gap-1 px-2 py-1 rounded border border-dashed border-slate-300 text-slate-400 hover:border-primary-400 hover:text-primary-500 transition-colors text-[11px]"
          >
            {uploadingField === 'floorPlan' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <FileImage className="w-3 h-3" />
            )}
            Schita
          </button>
          {form.floorPlan.map((url) => (
            <div key={url} className="relative group w-7 h-7 rounded border border-slate-200 overflow-hidden bg-slate-50">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile('floorPlan', url)}
                className="absolute inset-0 bg-red-500/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        {/* Photos */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => photosRef.current?.click()}
            disabled={uploadingField === 'photos'}
            className="flex items-center gap-1 px-2 py-1 rounded border border-dashed border-slate-300 text-slate-400 hover:border-primary-400 hover:text-primary-500 transition-colors text-[11px]"
          >
            {uploadingField === 'photos' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ImagePlus className="w-3 h-3" />
            )}
            Poze
          </button>
          {form.photos.map((url) => (
            <div key={url} className="relative group w-7 h-7 rounded border border-slate-200 overflow-hidden bg-slate-50">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile('photos', url)}
                className="absolute inset-0 bg-red-500/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        {/* Hidden file inputs */}
        <input
          ref={floorPlanRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => { if (e.target.files) handleUpload(e.target.files, 'floorPlan'); e.target.value = ''; }}
          className="hidden"
        />
        <input
          ref={photosRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => { if (e.target.files) handleUpload(e.target.files, 'photos'); e.target.value = ''; }}
          className="hidden"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || !form.name.trim() || !form.sqm || !form.warehousePrice}
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
          disabled={submitting || !form.name.trim() || !form.sqm || !form.warehousePrice}
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
