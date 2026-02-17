import { Logger } from '@nestjs/common';

const logger = new Logger('MapboxStaticHelper');

interface BuildingPin {
  lat: number;
  lng: number;
  name: string;
}

export async function fetchOverviewMap(
  buildings: BuildingPin[],
  width: number,
  height: number,
  token: string,
): Promise<Buffer | null> {
  if (!token || buildings.length === 0) return null;

  try {
    const markers = buildings
      .map((b, i) => {
        const label = i + 1;
        return `pin-l-${label}+14b8a6(${b.lng},${b.lat})`;
      })
      .join(',');

    const url = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${markers}/auto/${width}x${height}@2x?access_token=${token}&padding=60`;

    const res = await fetch(url);
    if (!res.ok) {
      logger.warn(`Mapbox overview map failed: ${res.status}`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    logger.warn('Failed to fetch overview map', err);
    return null;
  }
}

export async function fetchSatelliteImage(
  lat: number,
  lng: number,
  width: number,
  height: number,
  token: string,
  zoom = 14,
): Promise<Buffer | null> {
  if (!token) return null;

  try {
    const marker = `pin-l+14b8a6(${lng},${lat})`;
    const url = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${marker}/${lng},${lat},${zoom},0/${width}x${height}@2x?access_token=${token}`;

    const res = await fetch(url);
    if (!res.ok) {
      logger.warn(`Mapbox satellite image failed: ${res.status}`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    logger.warn('Failed to fetch satellite image', err);
    return null;
  }
}
