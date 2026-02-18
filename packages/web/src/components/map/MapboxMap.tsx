import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Romania center
const DEFAULT_CENTER: [number, number] = [25.0, 45.9];
const DEFAULT_ZOOM = 7;

const isMobile = () => window.innerWidth <= 768;

export interface MapUnit {
  id: number;
  name: string;
  warehousePrice: number | null;
  officePrice: number | null;
  maintenancePrice: number | null;
  hasOffice: boolean;
  officeSqm: number | null;
}

export interface DiscoveredMarker {
  osmId: number;
  name: string;
  lat: number;
  lng: number;
  type: string;
  address?: string;
  city?: string;
  county?: string;
  operator?: string;
  sqm?: number;
}

export interface MapBuilding {
  id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
  availableSqm: number | null;
  transactionType: string;
  address: string | null;
  location?: {
    id: number;
    name: string;
    county: string;
  } | null;
  units?: MapUnit[];
}

interface MapboxMapProps {
  buildings?: MapBuilding[];
  onBuildingClick?: (id: number) => void;
  selectedBuildingId?: number | null;
  className?: string;
  flyTo?: { lng: number; lat: number; zoom?: number } | null;
  pickMode?: boolean;
  onCoordinatePick?: (lng: number, lat: number) => void;
  markerPosition?: { lng: number; lat: number } | null;
}

export default function MapboxMap({
  buildings = [],
  onBuildingClick,
  selectedBuildingId,
  className = '',
  flyTo,
  pickMode = false,
  onCoordinatePick,
  markerPosition,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const pickerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [is3D, setIs3D] = useState(!isMobile());

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const container = mapContainer.current;

    const mobile = isMobile();
    map.current = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/light-v11',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: mobile ? 0 : 45,
      bearing: mobile ? 0 : -17.6,
    });

    const m = map.current;

    m.addControl(new mapboxgl.NavigationControl(), 'top-right');

    m.on('error', (e) => {
      console.error('[MapboxMap] error:', e.error?.message || e);
    });

    m.on('load', () => {
      // 3D buildings (skip on mobile for performance)
      if (!mobile) {
        const layers = m.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer) => layer.type === 'symbol' && layer.layout?.['text-field'],
        )?.id;

        m.addLayer(
          {
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 12,
            paint: {
              'fill-extrusion-color': [
                'interpolate', ['linear'], ['get', 'height'],
                0, '#e2e8f0',
                50, '#94a3b8',
                200, '#64748b',
              ],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.7,
            },
          },
          labelLayerId,
        );
      }

      // Toggle label visibility on zoom for mobile
      if (mobile) {
        const LABEL_ZOOM_THRESHOLD = 13;
        const updateZoomClass = () => {
          if (m.getZoom() >= LABEL_ZOOM_THRESHOLD) {
            container.classList.add('map-zoomed-in');
          } else {
            container.classList.remove('map-zoomed-in');
          }
        };
        m.on('zoom', updateZoomClass);
        updateZoomClass();
      }

      setMapLoaded(true);
    });

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Render buildings
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const validBuildings = buildings.filter(
      (b) => b.latitude != null && b.longitude != null,
    );

    if (validBuildings.length === 0) return;

    validBuildings.forEach((building) => {
      const isSelected = building.id === selectedBuildingId;
      const isRent = building.transactionType === 'RENT';
      const units = building.units ?? [];

      const el = document.createElement('div');
      el.className = 'mapbox-custom-marker';
      el.innerHTML = `
        <div class="marker-pin ${isRent ? 'marker-rent' : 'marker-sale'} ${isSelected ? 'marker-selected' : ''} marker-own">
          <div class="marker-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div class="marker-label">${building.name}${units.length > 0 ? ` (${units.length})` : ''}</div>
        </div>
        <div class="marker-pulse ${isRent ? 'pulse-rent' : 'pulse-sale'}"></div>
      `;

      // Build units HTML for popup
      const mobile = isMobile();
      const MAX_MOBILE_UNITS = 2;
      let unitsHtml = '';
      if (units.length > 0) {
        const visibleUnits = mobile ? units.slice(0, MAX_MOBILE_UNITS) : units;
        const hiddenCount = mobile ? Math.max(0, units.length - MAX_MOBILE_UNITS) : 0;
        const unitItems = visibleUnits.map((u) => {
          const prices: string[] = [];
          if (u.warehousePrice) prices.push(`Hala: ${u.warehousePrice}€`);
          if (u.officePrice) prices.push(`Birou: ${u.officePrice}€`);
          if (u.maintenancePrice) prices.push(`Menten: ${u.maintenancePrice}€`);
          const priceStr = prices.length > 0 ? prices.join(' · ') : 'Pret nesetat';
          return `
            <div style="padding: ${mobile ? '4px' : '6px'} 0; border-bottom: 1px solid #f1f5f9;">
              <div style="font-size: ${mobile ? '11px' : '13px'}; font-weight: 600; color: #1e293b;">${u.name}</div>
              <div style="font-size: ${mobile ? '10px' : '11px'}; color: #64748b; margin-top: 1px;">${priceStr}</div>
            </div>
          `;
        }).join('');
        const moreHtml = hiddenCount > 0
          ? `<div style="font-size: 10px; color: #3b82f6; font-weight: 600; padding-top: 3px;">+${hiddenCount} spatii</div>`
          : '';
        unitsHtml = `
          <div style="margin-bottom: ${mobile ? '6px' : '10px'};">
            <div style="font-size: ${mobile ? '9px' : '10px'}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: ${mobile ? '2px' : '4px'};">
              Spatii (${units.length})
            </div>
            ${unitItems}
            ${moreHtml}
          </div>
        `;
      } else if (!mobile) {
        unitsHtml = `
          <div style="padding: 8px 10px; background: #f8fafc; border-radius: 8px; margin-bottom: 10px; text-align: center;">
            <span style="font-size: 12px; color: #94a3b8;">Niciun spatiu adaugat</span>
          </div>
        `;
      }

      const popupContent = `
        <div class="map-popup">
          <div class="popup-header">
            <h3 class="popup-title">${building.name}</h3>
            <span class="popup-badge ${isRent ? 'badge-rent' : 'badge-sale'}">
              ${isRent ? 'Inchiriere' : 'Vanzare'}
            </span>
          </div>
          ${building.location ? `<p class="popup-location">${building.location.name}, ${building.location.county}</p>` : ''}
          ${building.address ? `<p class="popup-address">${building.address}</p>` : ''}
          ${unitsHtml}
          <button class="popup-action" data-building-id="${building.id}">
            Vezi detalii →
          </button>
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: mobile ? 15 : 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: mobile ? '220px' : '300px',
        className: 'mapbox-popup-custom',
      }).setHTML(popupContent);

      popup.on('open', () => {
        const btn = document.querySelector(`[data-building-id="${building.id}"]`);
        btn?.addEventListener('click', () => {
          onBuildingClick?.(building.id);
        });
      });

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat([building.longitude!, building.latitude!])
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener('click', () => {
        map.current?.flyTo({
          center: [building.longitude!, building.latitude!],
          zoom: mobile ? 14 : 15,
          pitch: mobile ? 0 : 60,
          bearing: mobile ? 0 : Math.random() * 60 - 30,
          duration: mobile ? 1200 : 2000,
          essential: true,
        });
      });

      markersRef.current.push(marker);
    });

    // Fit to all markers
    if (validBuildings.length > 0) {
      const mob = isMobile();
      const bounds = new mapboxgl.LngLatBounds();
      validBuildings.forEach((b) => bounds.extend([b.longitude!, b.latitude!]));
      map.current.fitBounds(bounds, {
        padding: mob
          ? { top: 50, bottom: 50, left: 30, right: 30 }
          : { top: 80, bottom: 80, left: 80, right: 80 },
        maxZoom: 14,
        pitch: mob ? 0 : 45,
        duration: mob ? 1000 : 1500,
      });
    }
  }, [buildings, mapLoaded, selectedBuildingId, onBuildingClick]);

  // Fly to
  useEffect(() => {
    if (!map.current || !mapLoaded || !flyTo) return;
    const mobile = isMobile();
    map.current.flyTo({
      center: [flyTo.lng, flyTo.lat],
      zoom: flyTo.zoom ?? (mobile ? 14 : 15),
      pitch: mobile ? 0 : 60,
      bearing: mobile ? 0 : -17.6,
      duration: mobile ? 1500 : 2500,
      essential: true,
    });
  }, [flyTo, mapLoaded]);

  // Pick mode
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;

    if (pickMode) {
      m.getCanvas().style.cursor = 'crosshair';

      const handleClick = (e: mapboxgl.MapMouseEvent) => {
        const { lng, lat } = e.lngLat;
        onCoordinatePick?.(lng, lat);

        if (pickerMarkerRef.current) {
          pickerMarkerRef.current.setLngLat([lng, lat]);
        } else {
          const el = document.createElement('div');
          el.className = 'picker-marker';
          el.innerHTML = `
            <div class="picker-pin">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          `;
          pickerMarkerRef.current = new mapboxgl.Marker({
            element: el,
            anchor: 'bottom',
            draggable: true,
          })
            .setLngLat([lng, lat])
            .addTo(m);

          pickerMarkerRef.current.on('dragend', () => {
            const lnglat = pickerMarkerRef.current!.getLngLat();
            onCoordinatePick?.(lnglat.lng, lnglat.lat);
          });
        }

        m.flyTo({
          center: [lng, lat],
          zoom: Math.max(m.getZoom(), 14),
          pitch: 50,
          duration: 1000,
        });
      };

      m.on('click', handleClick);
      return () => {
        m.off('click', handleClick);
        m.getCanvas().style.cursor = '';
      };
    } else {
      m.getCanvas().style.cursor = '';
    }
  }, [pickMode, mapLoaded, onCoordinatePick]);

  // Single marker for forms (works in both pickMode and non-pickMode)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (markerPosition) {
      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.setLngLat([markerPosition.lng, markerPosition.lat]);
      } else {
        const el = document.createElement('div');
        el.className = 'picker-marker';
        el.innerHTML = `
          <div class="picker-pin">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        `;
        pickerMarkerRef.current = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom',
          draggable: pickMode,
        })
          .setLngLat([markerPosition.lng, markerPosition.lat])
          .addTo(map.current!);

        if (pickMode) {
          pickerMarkerRef.current.on('dragend', () => {
            const lnglat = pickerMarkerRef.current!.getLngLat();
            onCoordinatePick?.(lnglat.lng, lnglat.lat);
          });
        }
      }
    } else if (!markerPosition && pickerMarkerRef.current) {
      pickerMarkerRef.current.remove();
      pickerMarkerRef.current = null;
    }
  }, [markerPosition, mapLoaded, pickMode, onCoordinatePick]);

  const toggle3D = useCallback(() => {
    if (!map.current) return;
    const m = map.current;
    if (is3D) {
      m.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
      if (m.getLayer('3d-buildings')) m.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', 0);
    } else {
      m.easeTo({ pitch: 45, bearing: -17.6, duration: 1000 });
      if (m.getLayer('3d-buildings')) m.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', 0.7);
    }
    setIs3D(!is3D);
  }, [is3D]);

  const resetView = useCallback(() => {
    if (!map.current) return;
    map.current.flyTo({
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: 0,
      bearing: 0,
      duration: 2000,
    });
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div className="absolute inset-0 rounded-lg overflow-hidden">
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Controls */}
      <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
        {!isMobile() && (
          <button onClick={toggle3D} className="map-control-btn" title={is3D ? 'Vedere 2D' : 'Vedere 3D'}>
            {is3D ? '2D' : '3D'}
          </button>
        )}
        <button onClick={resetView} className="map-control-btn" title="Reset vedere">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      {/* Pick mode indicator */}
      {pickMode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2 animate-bounce-subtle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Click pe harta pentru a selecta locatia
        </div>
      )}

      {/* Loading */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-slate-100 rounded-lg flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <span className="text-sm text-slate-500">Se incarca harta...</span>
          </div>
        </div>
      )}
    </div>
  );
}
