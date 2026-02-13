import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Building2 } from 'lucide-react';
import type { MapBuilding } from './MapboxMap';

interface MapSearchBarProps {
  buildings: MapBuilding[];
  onBuildingSelect: (building: MapBuilding) => void;
}

export default function MapSearchBar({
  buildings,
  onBuildingSelect,
}: MapSearchBarProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBuildings = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return buildings.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.address?.toLowerCase().includes(q) ||
        b.location?.name.toLowerCase().includes(q),
    ).slice(0, 10);
  }, [query, buildings]);

  return (
    <div ref={ref} className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-[400px] max-w-[calc(100%-120px)]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Cauta proprietate sau oras..."
          className="w-full pl-9 pr-9 py-2.5 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && filteredBuildings.length > 0 && (
        <div className="mt-1.5 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg max-h-[360px] overflow-y-auto">
          {filteredBuildings.map((b) => (
            <button
              key={`b-${b.id}`}
              onClick={() => {
                onBuildingSelect(b);
                setOpen(false);
                setQuery('');
              }}
              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-2.5"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{b.name}</p>
                <p className="text-xs text-slate-400 truncate">
                  {b.location ? `${b.location.name}, ${b.location.county}` : b.address || ''}
                </p>
              </div>
              {b.units && b.units.length > 0 && (
                <span className="ml-auto text-[10px] font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-md flex-shrink-0">
                  {b.units.length} {b.units.length === 1 ? 'spatiu' : 'spatii'}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
