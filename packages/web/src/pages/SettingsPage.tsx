import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { Settings, Upload, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { settingsService } from '@/services/settings.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgencySettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  primaryColor: string;
  logo: string | null;
  coverImage: string | null;
}

const DEFAULT_SETTINGS: AgencySettings = {
  name: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  primaryColor: '#2563eb',
  logo: null,
  coverImage: null,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { isAdmin } = useAuth();

  const [form, setForm] = useState<AgencySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // ----- Load settings -----

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const res = await settingsService.getAgency();
        const data = res.data;
        setForm({
          name: data.name ?? '',
          address: data.address ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          website: data.website ?? '',
          primaryColor: data.primaryColor ?? '#2563eb',
          logo: data.logo ?? null,
          coverImage: data.coverImage ?? null,
        });
      } catch {
        // Keep defaults on error
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  // ----- Form handlers -----

  const handleChange = (field: keyof AgencySettings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    field: 'logo' | 'coverImage',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setUploading = field === 'logo' ? setUploadingLogo : setUploadingCover;
    setUploading(true);
    try {
      const res = await settingsService.uploadImage(file);
      const url = res.data.url;
      setForm((prev) => ({ ...prev, [field]: url }));
      // Save immediately
      await settingsService.updateAgency({ [field]: url } as Record<string, unknown>);
      toast.success(field === 'logo' ? 'Logo actualizat' : 'Cover actualizat');
    } catch {
      toast.error('Eroare la upload');
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (field === 'logo' && logoInputRef.current) logoInputRef.current.value = '';
      if (field === 'coverImage' && coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async (field: 'logo' | 'coverImage') => {
    try {
      await settingsService.updateAgency({ [field]: null } as Record<string, unknown>);
      setForm((prev) => ({ ...prev, [field]: null }));
      toast.success(field === 'logo' ? 'Logo sters' : 'Cover sters');
    } catch {
      toast.error('Eroare la stergere');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await settingsService.updateAgency(form as unknown as Record<string, unknown>);
      toast.success('Setarile au fost salvate cu succes.');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'Eroare la salvare.';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Guard: admin only -----

  if (!isAdmin) {
    return (
      <div className="page-container">
        <div className="card p-12 text-center">
          <p className="text-sm text-slate-400">
            Nu aveti permisiunea de a accesa aceasta pagina.
          </p>
        </div>
      </div>
    );
  }

  // ----- Render -----

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="page-title">Setari agentie</h1>
            <p className="page-subtitle">
              Configureaza informatiile agentiei
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="inline-block w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <span className="ml-2 text-sm text-slate-500">Se incarca...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Logo & Cover Image */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Logo */}
              <div>
                <label className="label">Logo agentie</label>
                <div className="mt-1">
                  {form.logo ? (
                    <div className="relative inline-block">
                      <img
                        src={form.logo}
                        alt="Logo"
                        className="w-24 h-24 object-contain rounded-lg border border-slate-200 bg-white p-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('logo')}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
                    >
                      {uploadingLogo ? (
                        <span className="w-5 h-5 border-2 border-slate-200 border-t-primary-600 rounded-full animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          <span className="text-xs">Upload</span>
                        </>
                      )}
                    </button>
                  )}
                  {form.logo && (
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="mt-2 text-xs text-primary-600 hover:text-primary-700"
                    >
                      {uploadingLogo ? 'Se incarca...' : 'Schimba logo'}
                    </button>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'logo')}
                  />
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <label className="label">Imagine cover</label>
                <div className="mt-1">
                  {form.coverImage ? (
                    <div className="relative">
                      <img
                        src={form.coverImage}
                        alt="Cover"
                        className="w-full h-24 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('coverImage')}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="w-full h-24 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
                    >
                      {uploadingCover ? (
                        <span className="w-5 h-5 border-2 border-slate-200 border-t-primary-600 rounded-full animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="w-5 h-5" />
                          <span className="text-xs">Upload cover</span>
                        </>
                      )}
                    </button>
                  )}
                  {form.coverImage && (
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="mt-2 text-xs text-primary-600 hover:text-primary-700"
                    >
                      {uploadingCover ? 'Se incarca...' : 'Schimba cover'}
                    </button>
                  )}
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'coverImage')}
                  />
                </div>
              </div>
            </div>

            {/* Agency Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="settings-name" className="label">
                  Nume agentie
                </label>
                <input
                  id="settings-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="input"
                  placeholder="Numele agentiei"
                />
              </div>

              <div>
                <label htmlFor="settings-email" className="label">
                  Email
                </label>
                <input
                  id="settings-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="input"
                  placeholder="contact@agentie.ro"
                />
              </div>

              <div>
                <label htmlFor="settings-phone" className="label">
                  Telefon
                </label>
                <input
                  id="settings-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="input"
                  placeholder="+40..."
                />
              </div>

              <div>
                <label htmlFor="settings-website" className="label">
                  Website
                </label>
                <input
                  id="settings-website"
                  type="text"
                  value={form.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className="input"
                  placeholder="https://www.agentie.ro"
                />
              </div>

              <div>
                <label htmlFor="settings-address" className="label">
                  Adresa
                </label>
                <input
                  id="settings-address"
                  type="text"
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="input"
                  placeholder="Str. Exemplu nr. 1, Bucuresti"
                />
              </div>

              <div>
                <label htmlFor="settings-color" className="label">
                  Culoare principala
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="settings-color"
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={form.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="input flex-1"
                    placeholder="#2563eb"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="flex items-center justify-end pt-4 border-t border-slate-100">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                <span>{submitting ? 'Se salveaza...' : 'Salveaza setarile'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
