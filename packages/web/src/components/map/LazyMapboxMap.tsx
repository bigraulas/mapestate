import { lazy, Suspense, Component, type ReactNode, type ErrorInfo } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { MapBuilding, DiscoveredMarker } from './MapboxMap';

const MapboxMapLazy = lazy(() => import('./MapboxMap'));

interface MapboxMapProps {
  buildings?: MapBuilding[];
  discovered?: DiscoveredMarker[];
  onBuildingClick?: (id: number) => void;
  onDiscoveredClick?: (property: DiscoveredMarker) => void;
  selectedBuildingId?: number | null;
  className?: string;
  flyTo?: { lng: number; lat: number; zoom?: number } | null;
  pickMode?: boolean;
  onCoordinatePick?: (lng: number, lat: number) => void;
  markerPosition?: { lng: number; lat: number } | null;
}

// Error boundary to catch mapbox-gl loading errors
class MapErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Map error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-lg">
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <p className="text-sm font-medium text-slate-700">Eroare la incarcarea hartii</p>
            <p className="text-xs text-slate-400 max-w-xs">
              {this.state.error?.message || 'Verifica consola browser-ului pentru detalii.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              Reincearca
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LazyMapboxMap(props: MapboxMapProps) {
  return (
    <MapErrorBoundary>
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              <span className="text-sm text-slate-500">Se incarca harta...</span>
            </div>
          </div>
        }
      >
        <MapboxMapLazy {...props} />
      </Suspense>
    </MapErrorBoundary>
  );
}
