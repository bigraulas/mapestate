import { Injectable, Logger } from '@nestjs/common';

export interface DiscoveredProperty {
  osmId: number;
  name: string;
  lat: number;
  lng: number;
  type: 'warehouse' | 'industrial' | 'logistics' | 'commercial';
  address?: string;
  city?: string;
  county?: string;
  operator?: string;
  sqm?: number;
  tags: Record<string, string>;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

// Cache results for 2 hours
const CACHE_TTL = 2 * 60 * 60 * 1000;

// Major Romanian industrial regions (smaller bounding boxes = faster queries)
const ROMANIA_REGIONS = [
  { name: 'Bucuresti-Ilfov', bbox: '44.25,25.8,44.65,26.35' },
  { name: 'Cluj', bbox: '46.6,23.4,46.9,23.8' },
  { name: 'Timisoara', bbox: '45.6,21.1,45.85,21.4' },
  { name: 'Brasov', bbox: '45.55,25.45,45.75,25.75' },
  { name: 'Constanta', bbox: '44.1,28.5,44.25,28.7' },
  { name: 'Sibiu', bbox: '45.7,24.05,45.85,24.25' },
  { name: 'Ploiesti', bbox: '44.85,25.9,45.0,26.1' },
  { name: 'Arad', bbox: '46.1,21.25,46.25,21.4' },
  { name: 'Oradea', bbox: '47.0,21.85,47.1,22.0' },
  { name: 'Pitesti', bbox: '44.8,24.8,44.9,24.95' },
  { name: 'Craiova', bbox: '44.25,23.7,44.4,23.9' },
  { name: 'Deva-Simeria', bbox: '45.8,22.8,46.0,23.1' },
  { name: 'Targu Mures', bbox: '46.5,24.5,46.6,24.65' },
  { name: 'Iasi', bbox: '47.1,27.5,47.2,27.65' },
  { name: 'Bacau', bbox: '46.5,26.85,46.6,27.0' },
];

@Injectable()
export class DiscoverService {
  private readonly logger = new Logger(DiscoverService.name);
  private cache: { data: DiscoveredProperty[]; timestamp: number } | null =
    null;

  async discoverProperties(
    bounds?: { south: number; west: number; north: number; east: number },
    forceRefresh = false,
  ): Promise<DiscoveredProperty[]> {
    // Return cache if valid
    if (
      !forceRefresh &&
      this.cache &&
      Date.now() - this.cache.timestamp < CACHE_TTL
    ) {
      return this.filterByBounds(this.cache.data, bounds);
    }

    try {
      this.logger.log(
        'Fetching industrial properties from Overpass API (by region)...',
      );

      // Query all regions in parallel
      const regionResults = await Promise.allSettled(
        ROMANIA_REGIONS.map((region) => this.queryRegion(region.name, region.bbox)),
      );

      const allElements: OverpassElement[] = [];
      let successCount = 0;

      for (const result of regionResults) {
        if (result.status === 'fulfilled') {
          allElements.push(...result.value);
          successCount++;
        }
      }

      this.logger.log(
        `Received ${allElements.length} elements from ${successCount}/${ROMANIA_REGIONS.length} regions`,
      );

      const properties = this.parseOverpassResults(allElements);
      this.logger.log(`Parsed ${properties.length} industrial properties`);

      this.cache = { data: properties, timestamp: Date.now() };

      return this.filterByBounds(properties, bounds);
    } catch (error) {
      this.logger.error('Failed to fetch from Overpass API', error);
      return this.cache?.data
        ? this.filterByBounds(this.cache.data, bounds)
        : [];
    }
  }

  private async queryRegion(
    name: string,
    bbox: string,
  ): Promise<OverpassElement[]> {
    const query = `
[out:json][timeout:25];
(
  way["building"="warehouse"]["name"](${bbox});
  way["building"="industrial"]["name"](${bbox});
  way["name"~"[Ll]ogisti|[Dd]istri|[Dd]epozit|[Ww]arehouse|[Ii]ndustri.*[Pp]ark|CTPark|VGP|WDP|P3|Prologis|[Hh]al[aă]"](${bbox});
  way["landuse"="industrial"]["name"](${bbox});
  relation["landuse"="industrial"]["name"](${bbox});
);
out center tags;
`;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      this.logger.warn(`Overpass failed for ${name}: ${response.status}`);
      return [];
    }

    const json = (await response.json()) as { elements: OverpassElement[] };
    this.logger.log(`  ${name}: ${json.elements.length} elements`);
    return json.elements;
  }

  private filterByBounds(
    data: DiscoveredProperty[],
    bounds?: { south: number; west: number; north: number; east: number },
  ): DiscoveredProperty[] {
    if (!bounds) return data;
    return data.filter(
      (p) =>
        p.lat >= bounds.south &&
        p.lat <= bounds.north &&
        p.lng >= bounds.west &&
        p.lng <= bounds.east,
    );
  }

  private parseOverpassResults(
    elements: OverpassElement[],
  ): DiscoveredProperty[] {
    const seen = new Set<string>();
    const results: DiscoveredProperty[] = [];

    for (const el of elements) {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (!lat || !lon) continue;

      // Dedupe by rounding coords to ~11m precision
      const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const tags = el.tags ?? {};
      const name = tags.name || tags['name:ro'] || tags.operator || tags.brand;
      if (!name) continue; // Skip unnamed

      const type = this.classifyType(tags);

      results.push({
        osmId: el.id,
        name,
        lat,
        lng: lon,
        type,
        address: this.buildAddress(tags),
        city: tags['addr:city'] || tags['addr:municipality'] || undefined,
        county: tags['addr:county'] || undefined,
        operator: tags.operator || tags.brand || undefined,
        sqm: this.estimateSqm(tags),
        tags,
      });
    }

    // Sort: specific types first
    results.sort((a, b) => {
      const order = { logistics: 0, warehouse: 1, industrial: 2, commercial: 3 };
      return (order[a.type] ?? 9) - (order[b.type] ?? 9);
    });

    return results;
  }

  private classifyType(
    tags: Record<string, string>,
  ): DiscoveredProperty['type'] {
    const name = (tags.name || '').toLowerCase();
    const building = (tags.building || '').toLowerCase();

    if (name.includes('logist') || name.includes('distribut'))
      return 'logistics';
    if (
      building === 'warehouse' ||
      name.includes('depozit') ||
      name.includes('warehouse')
    )
      return 'warehouse';
    if (name.includes('comercial') || name.includes('retail'))
      return 'commercial';
    return 'industrial';
  }

  private buildAddress(tags: Record<string, string>): string | undefined {
    const parts: string[] = [];
    if (tags['addr:street']) {
      parts.push(tags['addr:street']);
      if (tags['addr:housenumber']) parts[0] += ` ${tags['addr:housenumber']}`;
    }
    if (tags['addr:city']) parts.push(tags['addr:city']);
    if (tags['addr:county']) parts.push(tags['addr:county']);
    return parts.length > 0 ? parts.join(', ') : undefined;
  }

  private estimateSqm(tags: Record<string, string>): number | undefined {
    if (tags.length && tags.width) {
      return parseFloat(tags.length) * parseFloat(tags.width);
    }
    return undefined;
  }
}
