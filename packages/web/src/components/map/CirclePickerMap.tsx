import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Romania center
const DEFAULT_CENTER: [number, number] = [25.9, 45.75];
const DEFAULT_ZOOM = 6.5;

interface CirclePickerMapProps {
  center: { lat: number; lng: number } | null;
  radiusKm: number;
  onCenterChange: (lat: number, lng: number) => void;
  className?: string;
}

/**
 * Generate a GeoJSON polygon approximating a circle.
 */
function generateCirclePolygon(
  center: [number, number],
  radiusKm: number,
  points = 64,
): number[][] {
  const coords: number[][] = [];
  const R = 6371;
  const [lng, lat] = center;

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle);
    const dy = radiusKm * Math.sin(angle);

    const newLat = lat + (dy / R) * (180 / Math.PI);
    const newLng =
      lng + (dx / (R * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);

    coords.push([newLng, newLat]);
  }

  return coords;
}

export default function CirclePickerMap({
  center,
  radiusKm,
  onCenterChange,
  className = '',
}: CirclePickerMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Store callback in ref to avoid re-initializing map
  const onCenterChangeRef = useRef(onCenterChange);
  onCenterChangeRef.current = onCenterChange;

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: center ? [center.lng, center.lat] : DEFAULT_CENTER,
      zoom: center ? 9 : DEFAULT_ZOOM,
    });

    const m = map.current;
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    m.on('load', () => {
      // Add circle source and layers
      m.addSource('search-circle', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      m.addLayer({
        id: 'search-circle-fill',
        type: 'fill',
        source: 'search-circle',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.12,
        },
      });

      m.addLayer({
        id: 'search-circle-line',
        type: 'line',
        source: 'search-circle',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });

      setMapLoaded(true);
    });

    // Click to place center
    m.on('click', (e: mapboxgl.MapMouseEvent) => {
      onCenterChangeRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker position
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (center) {
      if (markerRef.current) {
        markerRef.current.setLngLat([center.lng, center.lat]);
      } else {
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
        `;
        markerRef.current = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
          draggable: true,
        })
          .setLngLat([center.lng, center.lat])
          .addTo(map.current);

        markerRef.current.on('dragend', () => {
          const lnglat = markerRef.current!.getLngLat();
          onCenterChangeRef.current(lnglat.lat, lnglat.lng);
        });
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [center, mapLoaded]);

  // Update circle polygon
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('search-circle') as mapboxgl.GeoJSONSource;
    if (!source) return;

    if (center && radiusKm > 0) {
      const polygon = generateCirclePolygon(
        [center.lng, center.lat],
        radiusKm,
      );
      source.setData({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [polygon] },
        properties: {},
      });
    } else {
      source.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [center, radiusKm, mapLoaded]);

  // Fit to circle bounds when center changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !center) return;

    const R = 6371;
    const dLat = (radiusKm / R) * (180 / Math.PI);
    const dLng =
      (radiusKm / (R * Math.cos((center.lat * Math.PI) / 180))) *
      (180 / Math.PI);

    map.current.fitBounds(
      [
        [center.lng - dLng * 1.3, center.lat - dLat * 1.3],
        [center.lng + dLng * 1.3, center.lat + dLat * 1.3],
      ],
      { duration: 800, maxZoom: 13 },
    );
  }, [center, radiusKm, mapLoaded]);

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Instruction overlay when no center */}
      {!center && mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-sm border border-slate-200 text-sm text-slate-600 font-medium flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            Apasa pe harta
          </div>
        </div>
      )}

      {/* Loading */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
          <span className="inline-block w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
