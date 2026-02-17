import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  ChevronLeft,
  Plus,
  Loader2,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  Edit3,
  ChevronDown,
  ChevronUp,
  Dock,
  ArrowRight,
  Image,
  UserPlus,
} from 'lucide-react';
import type { Building, Unit } from '@dunwell/shared';
import { TransactionType } from '@dunwell/shared';
import { buildingsService, unitsService } from '@/services';
import { usersService } from '@/services/users.service';
import { MapboxMap } from '@/components/map';
import UnitFormPanel from '@/components/units/UnitFormPanel';
import { useAuth } from '@/hooks/useAuth';
import Modal from '@/components/shared/Modal';
import toast from 'react-hot-toast';

export default function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [building, setBuilding] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);

  const { isAdmin } = useAuth();
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignUserId, setReassignUserId] = useState<number | ''>('');
  const [reassignSubmitting, setReassignSubmitting] = useState(false);
  const [brokersList, setBrokersList] = useState<{id: number; firstName: string; lastName: string}[]>([]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [bRes, uRes] = await Promise.all([
        buildingsService.getById(parseInt(id, 10)),
        unitsService.getByBuilding(parseInt(id, 10)),
      ]);
      setBuilding(bRes.data);
      setUnits(Array.isArray(uRes.data) ? uRes.data : []);
    } catch {
      setBuilding(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!reassignOpen || brokersList.length > 0) return;
    const fetchBrokers = async () => {
      try {
        const res = await usersService.getAll(1, 100);
        setBrokersList(res.data.data ?? []);
      } catch {}
    };
    fetchBrokers();
  }, [reassignOpen, brokersList.length]);

  const handleReassign = async () => {
    if (!building || !reassignUserId) return;
    setReassignSubmitting(true);
    try {
      await buildingsService.reassign(building.id, Number(reassignUserId));
      setReassignOpen(false);
      toast.success('Proprietate reasignata cu succes!');
      fetchData();
    } catch {
      toast.error('Eroare la reasignare.');
    } finally {
      setReassignSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Se incarca...</span>
      </div>
    );
  }

  if (!building) {
    return (
      <div className="page-container">
        <p className="text-sm text-slate-500">Proprietatea nu a fost gasita.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/proprietati')}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Building2 className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="page-title">{building.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {building.location && (
                <span className="text-sm text-slate-500">
                  {building.location.name}, {building.location.county}
                </span>
              )}
              <span
                className={`badge text-xs ${
                  building.transactionType === TransactionType.RENT
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {building.transactionType === TransactionType.RENT ? 'Inchiriere' : 'Vanzare'}
              </span>
              {building.osmId && (
                <span className="badge text-xs bg-amber-50 text-amber-600">OSM</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => { setReassignUserId(''); setReassignOpen(true); }}
              className="btn-secondary"
            >
              <UserPlus className="w-4 h-4" />
              <span>Reasigneaza</span>
            </button>
          )}
          <button
            onClick={() => navigate(`/proprietati/${id}/edit`)}
            className="btn-secondary"
          >
            <Edit3 className="w-4 h-4" />
            <span>Editeaza</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Address + owner */}
          <div className="card card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Detalii</h3>
                {building.address && (
                  <div className="flex items-start gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-600">{building.address}</span>
                  </div>
                )}
                {building.totalSqm != null && (
                  <p className="text-sm text-slate-600 mb-1">
                    Suprafata totala: <span className="font-medium">{building.totalSqm.toLocaleString('ro-RO')} mp</span>
                  </p>
                )}
                {building.availableSqm != null && (
                  <p className="text-sm text-slate-600 mb-1">
                    Disponibil: <span className="font-medium">{building.availableSqm.toLocaleString('ro-RO')} mp</span>
                  </p>
                )}
                {building.serviceCharge != null && (
                  <p className="text-sm text-slate-600 mb-1">
                    Service charge: <span className="font-medium">{building.serviceCharge.toFixed(2)} EUR/mp</span>
                  </p>
                )}
                {building.description && (
                  <p className="text-sm text-slate-500 mt-3">{building.description}</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Proprietar</h3>
                {building.ownerName ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{building.ownerName}</span>
                    </div>
                    {building.ownerPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <a href={`tel:${building.ownerPhone}`} className="text-sm text-primary-600 hover:underline">
                          {building.ownerPhone}
                        </a>
                      </div>
                    )}
                    {building.ownerEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <a href={`mailto:${building.ownerEmail}`} className="text-sm text-primary-600 hover:underline">
                          {building.ownerEmail}
                        </a>
                      </div>
                    )}
                    {building.minContractYears != null && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          Contract minim: {building.minContractYears} ani
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Niciun proprietar adaugat</p>
                )}
              </div>
            </div>
          </div>

          {/* Units */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">
                Spatii ({units.length})
              </h3>
              <button
                onClick={() => {
                  setEditingUnit(null);
                  setShowUnitForm(true);
                }}
                className="btn-primary !py-1.5 !px-3 !text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adauga spatiu</span>
              </button>
            </div>

            {units.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-slate-400">Niciun spatiu adaugat inca.</p>
                <button
                  onClick={() => {
                    setEditingUnit(null);
                    setShowUnitForm(true);
                  }}
                  className="mt-2 text-sm text-primary-600 hover:underline"
                >
                  Adauga primul spatiu
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {units.map((unit) => {
                  const isExpanded = expandedUnit === unit.id;
                  return (
                    <div key={unit.id} className="px-5">
                      <button
                        onClick={() => setExpandedUnit(isExpanded ? null : unit.id)}
                        className="w-full py-3.5 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{unit.name}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                  unit.transactionType === TransactionType.SALE
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-blue-50 text-blue-600'
                                }`}
                              >
                                {unit.transactionType === TransactionType.SALE ? 'Vanzare' : 'Inchiriere'}
                              </span>
                              {unit.usefulHeight != null && (
                                <span className="text-xs text-slate-400">H: {unit.usefulHeight}m</span>
                              )}
                              {unit.warehousePrice != null && (
                                <span className="text-xs text-slate-400">
                                  Hala: {unit.warehousePrice} EUR/mp
                                </span>
                              )}
                              {unit.hasOffice && (
                                <span className="text-xs text-blue-500">Birou</span>
                              )}
                              {unit.docks != null && unit.docks > 0 && (
                                <span className="text-xs text-slate-400 flex items-center gap-0.5">
                                  <Dock className="w-3 h-3" /> {unit.docks}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingUnit(unit);
                              setShowUnitForm(true);
                            }}
                            className="p-1 rounded text-slate-300 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            title="Editeaza spatiu"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="pb-4 pl-11 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          {unit.usefulHeight != null && (
                            <div>
                              <span className="text-slate-400">Inaltime utila:</span>{' '}
                              <span className="text-slate-700">{unit.usefulHeight} m</span>
                            </div>
                          )}
                          {unit.hasOffice && unit.officeSqm != null && (
                            <div>
                              <span className="text-slate-400">Birou:</span>{' '}
                              <span className="text-slate-700">{unit.officeSqm} mp</span>
                            </div>
                          )}
                          {unit.warehousePrice != null && (
                            <div>
                              <span className="text-slate-400">Pret hala:</span>{' '}
                              <span className="text-slate-700">{unit.warehousePrice} EUR/mp/luna</span>
                            </div>
                          )}
                          {unit.officePrice != null && (
                            <div>
                              <span className="text-slate-400">Pret birou:</span>{' '}
                              <span className="text-slate-700">{unit.officePrice} EUR/mp/luna</span>
                            </div>
                          )}
                          {unit.maintenancePrice != null && (
                            <div>
                              <span className="text-slate-400">Mentenanta:</span>{' '}
                              <span className="text-slate-700">{unit.maintenancePrice} EUR/mp/luna</span>
                            </div>
                          )}
                          {unit.salePrice != null && (
                            <div>
                              <span className="text-slate-400">Pret achizitie:</span>{' '}
                              <span className="text-slate-700">
                                {unit.salePrice.toLocaleString('ro-RO')} EUR
                                {unit.salePriceVatIncluded ? ' (incl. TVA)' : ' + TVA'}
                              </span>
                            </div>
                          )}
                          {unit.docks != null && (
                            <div>
                              <span className="text-slate-400">Docks:</span>{' '}
                              <span className="text-slate-700">{unit.docks}</span>
                            </div>
                          )}
                          {unit.driveins != null && (
                            <div>
                              <span className="text-slate-400">Drive-ins:</span>{' '}
                              <span className="text-slate-700">{unit.driveins}</span>
                            </div>
                          )}
                          {unit.crossDock && (
                            <div>
                              <span className="badge text-xs bg-violet-50 text-violet-600">Cross-dock</span>
                            </div>
                          )}
                          {unit.floorPlan && (
                            <div className="col-span-2">
                              <a
                                href={unit.floorPlan}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary-600 hover:underline"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Vezi schita
                                <ArrowRight className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                          {unit.photos && Array.isArray(unit.photos) && unit.photos.length > 0 && (
                            <div className="col-span-2 flex gap-2 mt-1">
                              {(unit.photos as string[]).map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={url}
                                    alt={`${unit.name} foto ${i + 1}`}
                                    className="w-16 h-16 rounded-lg object-cover border border-slate-200 hover:ring-2 hover:ring-primary-400 transition"
                                  />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: mini map */}
        <div className="space-y-6">
          {building.latitude && building.longitude && (
            <div className="card overflow-hidden">
              <div className="h-[250px]">
                <MapboxMap
                  buildings={[
                    {
                      id: building.id,
                      name: building.name,
                      latitude: building.latitude,
                      longitude: building.longitude,
                      availableSqm: building.availableSqm ?? null,
                      transactionType: building.transactionType,
                      address: building.address ?? null,
                      location: building.location ?? null,
                    },
                  ]}
                  flyTo={{
                    lng: building.longitude,
                    lat: building.latitude,
                    zoom: 14,
                  }}
                />
              </div>
              <div className="px-4 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-mono">
                  {building.latitude.toFixed(6)}, {building.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="card card-body space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Rezumat</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-primary-600">{units.length}</p>
                <p className="text-xs text-slate-500">Spatii</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-primary-600">
                  {units.filter((u) => u.photos && (u.photos as string[]).length > 0).length}
                </p>
                <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                  <Image className="w-3 h-3" /> Cu poze
                </p>
              </div>
            </div>
            {building.user && (
              <div className="text-xs text-slate-400">
                Agent: {building.user.firstName} {building.user.lastName}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unit form panel */}
      {showUnitForm && (
        <UnitFormPanel
          buildingId={parseInt(id!, 10)}
          unit={editingUnit}
          onClose={() => {
            setShowUnitForm(false);
            setEditingUnit(null);
          }}
          onSaved={() => {
            setShowUnitForm(false);
            setEditingUnit(null);
            fetchData();
          }}
        />
      )}

      {/* Reassign Modal - admin only */}
      {isAdmin && (
        <Modal
          isOpen={reassignOpen}
          onClose={() => setReassignOpen(false)}
          title="Reasigneaza proprietatea"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Selecteaza broker-ul caruia doresti sa ii atribuiti proprietatea <strong>{building?.name}</strong>.
            </p>
            <div>
              <label htmlFor="reassign-broker" className="label">Broker nou</label>
              <select
                id="reassign-broker"
                value={reassignUserId}
                onChange={(e) => setReassignUserId(e.target.value ? Number(e.target.value) : '')}
                className="input"
              >
                <option value="">Selecteaza un broker...</option>
                {brokersList.map((b) => (
                  <option key={b.id} value={b.id}>{b.firstName} {b.lastName}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setReassignOpen(false)} className="btn-secondary">Anuleaza</button>
              <button onClick={handleReassign} disabled={reassignSubmitting || !reassignUserId} className="btn-primary">
                {reassignSubmitting && <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span>{reassignSubmitting ? 'Se salveaza...' : 'Reasigneaza'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
