import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { fetchOverviewMap, fetchSatelliteImage } from './mapbox-static.helper';

// pdfkit is already installed
const PDFDocument = require('pdfkit');

// 16:9 landscape slide dimensions (in PDF points)
const SLIDE_W = 960;
const SLIDE_H = 540;

// Font paths (Roboto supports Romanian diacritics: ă, â, î, ș, ț)
const FONT_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'Roboto-Regular.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'Roboto-Bold.ttf');

// Brand colors (BRAND is set dynamically from agency.primaryColor)
const DEFAULT_BRAND = '#0d9488';
const WHITE = '#ffffff';
const DARK = '#1e293b';
const GRAY = '#64748b';
const LIGHT_GRAY = '#94a3b8';
const BG_LIGHT = '#f8fafc';

interface UnitData {
  name: string;
  warehouseSpace?: { sqm: number; rentPrice: number } | null;
  officeSpace?: { sqm: number; rentPrice: number } | null;
  sanitarySpace?: { sqm: number; rentPrice: number } | null;
  othersSpace?: { sqm: number; rentPrice: number } | null;
  usefulHeight?: number | null;
  docks?: number | null;
  driveins?: number | null;
  floorPlan?: string | null;
  photos?: string[] | null;
  images?: string[] | null;
  temperature?: string | null;
  sprinkler?: boolean;
  hydrantSystem?: boolean;
  isuAuthorization?: boolean;
  heating?: string | null;
  buildingStructure?: string | null;
  gridStructure?: string | null;
  gridFormat?: string | null;
  floorLoading?: number | null;
  lighting?: string | null;
  serviceCharge?: number | null;
  availableFrom?: string | Date | null;
  contractLength?: string | null;
  expandingPossibilities?: string | null;
  salePrice?: number | null;
  salePriceVatIncluded?: boolean;
}

interface BuildingData {
  id: number;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  transactionType?: string;
  expandingPossibilities?: string | null;
  location?: { name: string; county?: string } | null;
  units: UnitData[];
}

interface DealData {
  name: string;
  dealType: string;
  company?: { name: string; logo?: string | null } | null;
  person?: { name: string } | null;
  locations?: { name: string }[];
  user?: {
    firstName: string;
    lastName: string;
    phone?: string | null;
    email: string;
    avatar?: string | null;
  } | null;
}

interface AgencyData {
  name: string;
  logo?: string | null;
  coverImage?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  primaryColor?: string;
}

interface AggregatedSpecs {
  // Commercial
  warehouseSqm: number;
  warehouseRent: number;
  officeSanitarySqm: number;
  officeSanitaryRent: number;
  serviceCharge: number | null;
  contractLength: string | null;
  availableFrom: string | null;
  expandingPossibilities: string | null;
  // Sale-specific
  salePrice: number | null;
  salePriceVatIncluded: boolean;
  // Technical
  clearHeight: number | null;
  temperature: string | null;
  docks: number;
  driveins: number;
  sprinkler: boolean;
  hydrantSystem: boolean;
  isuAuthorization: boolean;
  heating: string | null;
  buildingStructure: string | null;
  gridDimensions: string | null;
  floorLoading: number | null;
  lighting: string | null;
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private readonly uploadDir: string;
  private imageCache = new Map<string, Buffer | null>();
  private BRAND = DEFAULT_BRAND;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = this.config.get('UPLOAD_DIR', './uploads');
  }

  async generate(
    deal: DealData,
    buildings: BuildingData[],
    agency: AgencyData,
  ): Promise<Buffer> {
    // Clear image cache from previous generation
    this.imageCache.clear();

    // Use agency's primary color or default
    this.BRAND = agency.primaryColor || DEFAULT_BRAND;

    const mapboxToken = this.config.get<string>('MAPBOX_TOKEN', '');

    // Pre-fetch all maps in parallel
    const buildingsWithCoords = buildings.filter(
      (b) => b.latitude && b.longitude,
    );

    const [overviewMapBuffer, ...satelliteBuffers] = await Promise.all([
      buildingsWithCoords.length > 0
        ? fetchOverviewMap(
            buildingsWithCoords.map((b) => ({
              lat: b.latitude!,
              lng: b.longitude!,
              name: b.name,
            })),
            600,
            400,
            mapboxToken,
          )
        : Promise.resolve(null),
      ...buildingsWithCoords.map((b) =>
        fetchSatelliteImage(b.latitude!, b.longitude!, 420, 380, mapboxToken),
      ),
    ]);

    // Create satellite buffer map by building id
    const satelliteMap = new Map<number, Buffer | null>();
    buildingsWithCoords.forEach((b, i) => {
      satelliteMap.set(b.id, satelliteBuffers[i]);
    });

    // Pre-fetch agency logo and cover image if they are URLs
    if (agency.logo) {
      const logoBuf = await this.loadImage(agency.logo);
      if (logoBuf) agency = { ...agency, logo: '__buffer__logo' };
      this.imageCache.set('__buffer__logo', logoBuf);
    }
    if (agency.coverImage) {
      const coverBuf = await this.loadImage(agency.coverImage);
      if (coverBuf) agency = { ...agency, coverImage: '__buffer__cover' };
      this.imageCache.set('__buffer__cover', coverBuf);
    }

    // Pre-load photo buffers for all buildings
    const photoMap = new Map<number, Buffer[]>();
    for (const building of buildings) {
      const photos: Buffer[] = [];
      for (const unit of building.units) {
        const unitPhotos = unit.photos || unit.images || [];
        if (Array.isArray(unitPhotos)) {
          for (const photoPath of unitPhotos) {
            const buf = await this.loadImage(photoPath as string);
            if (buf) photos.push(buf);
          }
        }
      }
      photoMap.set(building.id, photos);
    }

    return new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument({
        size: [SLIDE_W, SLIDE_H],
        margin: 0,
        autoFirstPage: false,
      });

      // Register Roboto fonts (Unicode support for Romanian diacritics)
      if (fs.existsSync(FONT_REGULAR)) {
        doc.registerFont('Roboto', FONT_REGULAR);
        doc.registerFont('Roboto-Bold', fs.existsSync(FONT_BOLD) ? FONT_BOLD : FONT_REGULAR);
      }
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // ── Slide 1: Cover ──
      this.renderCover(doc, deal, agency);

      // ── Slide 2: Overview Map ──
      if (overviewMapBuffer) {
        this.renderOverviewMap(doc, buildings, overviewMapBuffer, deal, agency);
      }

      // ── Per Building: Specs + Photos ──
      buildings.forEach((building, idx) => {
        const num = idx + 1;
        const specs = this.aggregateSpecs(building);
        const satellite = satelliteMap.get(building.id) || null;
        this.renderSpecsSlide(doc, building, num, specs, satellite, agency);

        const photos = photoMap.get(building.id) || [];
        if (photos.length > 0) {
          this.renderPhotosSlide(doc, building, num, photos, agency);
        }
      });

      // ── Last Slide: Contact ──
      this.renderContactSlide(doc, deal, agency);

      doc.end();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE RENDERERS
  // ═══════════════════════════════════════════════════════════════════════════

  private renderCover(doc: any, deal: DealData, agency: AgencyData) {
    doc.addPage();

    // Background gradient (solid teal since pdfkit doesn't do gradients easily)
    doc.rect(0, 0, SLIDE_W, SLIDE_H).fill(this.BRAND);

    // If agency has a cover image, try to use it
    if (agency.coverImage) {
      const coverBuf = this.loadLocalImage(agency.coverImage);
      if (coverBuf) {
        try {
          doc.image(coverBuf, 0, 0, { width: SLIDE_W, height: SLIDE_H });
          // Overlay for text readability
          doc.rect(0, 0, SLIDE_W, SLIDE_H).fill('rgba(13, 148, 136, 0.75)');
        } catch {
          // If image fails, continue with solid background
        }
      }
    }

    // Title — use deal name (e.g. "Maspex - Depozit Logistic Bucuresti")
    const title = deal.name;

    doc
      .font('Roboto-Bold')
      .fontSize(36)
      .fillColor(WHITE)
      .text(title, 60, 140, { width: SLIDE_W - 120 });

    // Location subtitle
    const locationText =
      deal.locations && deal.locations.length > 0
        ? deal.locations.map((l) => l.name).join(', ')
        : '';
    if (locationText) {
      doc
        .font('Roboto')
        .fontSize(18)
        .fillColor('rgba(255,255,255,0.85)')
        .text(locationText, 60, 195, { width: SLIDE_W - 120 });
    }

    // Date
    const dateStr = new Date().toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    doc
      .font('Roboto')
      .fontSize(14)
      .fillColor('rgba(255,255,255,0.7)')
      .text(dateStr, 60, 230);

    // "To:" + Company name
    if (deal.company) {
      doc
        .font('Roboto')
        .fontSize(12)
        .fillColor('rgba(255,255,255,0.6)')
        .text('To:', 60, 320);
      doc
        .font('Roboto-Bold')
        .fontSize(20)
        .fillColor(WHITE)
        .text(deal.company.name, 60, 340, { width: 500 });
    }

    // Agency logo/name bottom-right
    this.drawAgencyBranding(doc, agency, SLIDE_W - 250, SLIDE_H - 60, WHITE);
  }

  private renderOverviewMap(
    doc: any,
    buildings: BuildingData[],
    mapBuffer: Buffer,
    deal: DealData,
    agency: AgencyData,
  ) {
    doc.addPage();
    doc.rect(0, 0, SLIDE_W, SLIDE_H).fill(WHITE);

    // Header bar
    this.drawSlideHeader(doc, this.getCityName(deal), '');

    // Left side: numbered building list
    const listX = 40;
    let listY = 80;
    doc
      .font('Roboto-Bold')
      .fontSize(14)
      .fillColor(this.BRAND)
      .text('PROPOSALS:', listX, listY);
    listY += 30;

    buildings.forEach((b, i) => {
      doc
        .font('Roboto-Bold')
        .fontSize(11)
        .fillColor(DARK)
        .text(`${i + 1}.`, listX, listY, { continued: true })
        .font('Roboto')
        .text(`  ${b.name}`, { width: 280 });

      if (b.location) {
        doc
          .font('Roboto')
          .fontSize(9)
          .fillColor(GRAY)
          .text(`   ${b.location.name}`, listX + 20, listY + 16, {
            width: 260,
          });
        listY += 36;
      } else {
        listY += 22;
      }
    });

    // Right side: map image
    const mapX = 360;
    const mapY = 60;
    const mapW = 560;
    const mapH = 400;
    try {
      doc.image(mapBuffer, mapX, mapY, {
        fit: [mapW, mapH],
        align: 'center',
        valign: 'center',
      });
    } catch {
      // If map fails, draw placeholder
      doc
        .rect(mapX, mapY, mapW, mapH)
        .fill(BG_LIGHT);
      doc
        .font('Roboto')
        .fontSize(12)
        .fillColor(GRAY)
        .text('Map not available', mapX + mapW / 2 - 50, mapY + mapH / 2);
    }

    // Agency branding bottom-left
    this.drawAgencyBranding(doc, agency, 40, SLIDE_H - 40, this.BRAND);
  }

  private renderSpecsSlide(
    doc: any,
    building: BuildingData,
    num: number,
    specs: AggregatedSpecs,
    satellite: Buffer | null,
    agency: AgencyData,
  ) {
    doc.addPage();
    doc.rect(0, 0, SLIDE_W, SLIDE_H).fill(WHITE);

    // Header
    this.drawSlideHeader(doc, `${num}. ${building.name}`, building.address || '');

    // ── Left column: specs ──
    const colX = 40;
    let y = 85;
    const colW = 440;

    // Commercial specs
    doc
      .font('Roboto-Bold')
      .fontSize(11)
      .fillColor(this.BRAND)
      .text('COMMERCIAL SPECS', colX, y);
    y += 20;

    const isSale = building.transactionType === 'SALE' || building.transactionType === 'RENT_AND_SALE';
    const isRent = building.transactionType === 'RENT' || building.transactionType === 'RENT_AND_SALE';
    const commercialRows: [string, string][] = [];

    if (isSale && specs.salePrice != null) {
      // SALE / RENT_AND_SALE: show fixed sale price
      const vatSuffix = specs.salePriceVatIncluded ? '' : ' + TVA';
      commercialRows.push([
        'pret achizitie',
        `${this.fmtNum(specs.salePrice)} EUR${vatSuffix}`,
      ]);
    }

    if (specs.warehouseSqm > 0) {
      commercialRows.push([
        'warehouse surface',
        `${this.fmtNum(specs.warehouseSqm)} sqm`,
      ]);
    }
    if (isRent && specs.warehouseRent > 0) {
      commercialRows.push([
        'rent warehouse',
        `${specs.warehouseRent.toFixed(2)} EUR/sqm/month`,
      ]);
    }
    if (isRent && specs.serviceCharge != null) {
      commercialRows.push([
        'service charge',
        `${specs.serviceCharge.toFixed(2)} EUR/sqm/month`,
      ]);
    }
    if (specs.officeSanitarySqm > 0) {
      commercialRows.push([
        'office/sanitary surface',
        `${this.fmtNum(specs.officeSanitarySqm)} sqm`,
      ]);
    }
    if (isRent && specs.officeSanitaryRent > 0) {
      commercialRows.push([
        'rent office/sanitary',
        `${specs.officeSanitaryRent.toFixed(2)} EUR/sqm/month`,
      ]);
    }
    if (specs.contractLength) {
      commercialRows.push(['contract length', specs.contractLength]);
    }
    if (specs.availableFrom) {
      commercialRows.push(['availability', specs.availableFrom]);
    }
    if (specs.expandingPossibilities) {
      commercialRows.push([
        'expanding possibilities',
        specs.expandingPossibilities,
      ]);
    }

    y = this.drawSpecTable(doc, commercialRows, colX, y, colW);

    y += 15;

    // Technical specs
    doc
      .font('Roboto-Bold')
      .fontSize(11)
      .fillColor(this.BRAND)
      .text('TECHNICAL SPECS', colX, y);
    y += 20;

    const technicalRows: [string, string][] = [];
    if (specs.clearHeight != null) {
      technicalRows.push(['clear height', `${specs.clearHeight} m`]);
    }
    if (specs.temperature) {
      technicalRows.push(['type', specs.temperature]);
    }
    if (specs.docks > 0) {
      technicalRows.push(['no. of docks', String(specs.docks)]);
    }
    if (specs.driveins > 0) {
      technicalRows.push(['no. of drive-ins', String(specs.driveins)]);
    }
    if (specs.sprinkler || specs.hydrantSystem) {
      const parts: string[] = [];
      if (specs.sprinkler) parts.push('sprinkler');
      if (specs.hydrantSystem) parts.push('hydrants');
      technicalRows.push(['sprinkler & hydrants', parts.join(' + ')]);
    }
    if (specs.isuAuthorization) {
      technicalRows.push(['ISU authorization', 'yes']);
    }
    if (specs.heating) {
      technicalRows.push(['heating', specs.heating]);
    }
    if (specs.buildingStructure) {
      technicalRows.push(['building structure', specs.buildingStructure]);
    }
    if (specs.gridDimensions) {
      technicalRows.push(['grid dimensions', specs.gridDimensions]);
    }
    if (specs.floorLoading != null) {
      technicalRows.push(['floor loading', `${specs.floorLoading} t/sqm`]);
    }
    if (specs.lighting) {
      technicalRows.push(['type of lighting', specs.lighting]);
    }

    this.drawSpecTable(doc, technicalRows, colX, y, colW);

    // ── Right column: satellite image ──
    const imgX = 500;
    const imgY = 85;
    const imgW = 420;
    const imgH = 380;

    if (satellite) {
      try {
        doc.image(satellite, imgX, imgY, {
          fit: [imgW, imgH],
          align: 'center',
          valign: 'center',
        });
      } catch {
        this.drawImagePlaceholder(doc, imgX, imgY, imgW, imgH);
      }
    } else {
      this.drawImagePlaceholder(doc, imgX, imgY, imgW, imgH);
    }

    // Agency branding
    this.drawAgencyBranding(doc, agency, 40, SLIDE_H - 40, this.BRAND);
  }

  private renderPhotosSlide(
    doc: any,
    building: BuildingData,
    num: number,
    photos: Buffer[],
    agency: AgencyData,
  ) {
    // Process in batches of 4 photos per slide
    const batchSize = 4;
    for (let batch = 0; batch < photos.length; batch += batchSize) {
      const batchPhotos = photos.slice(batch, batch + batchSize);

      doc.addPage();
      doc.rect(0, 0, SLIDE_W, SLIDE_H).fill(WHITE);

      // Header
      const suffix = photos.length > batchSize ? ` (${Math.floor(batch / batchSize) + 1}/${Math.ceil(photos.length / batchSize)})` : '';
      this.drawSlideHeader(doc, `${num}. ${building.name}${suffix}`, 'Photos');

      const areaX = 40;
      const areaY = 70;
      const areaW = SLIDE_W - 80;
      const areaH = SLIDE_H - 110;

      this.layoutPhotos(doc, batchPhotos, areaX, areaY, areaW, areaH);

      // Agency branding
      this.drawAgencyBranding(doc, agency, 40, SLIDE_H - 40, this.BRAND);
    }
  }

  private renderContactSlide(doc: any, deal: DealData, agency: AgencyData) {
    doc.addPage();
    doc.rect(0, 0, SLIDE_W, SLIDE_H).fill(this.BRAND);

    // Broker info (left side)
    const user = deal.user;
    if (user) {
      const brokerName = `${user.firstName} ${user.lastName}`;

      doc
        .font('Roboto-Bold')
        .fontSize(28)
        .fillColor(WHITE)
        .text(brokerName, 60, 140, { width: 500 });

      doc
        .font('Roboto')
        .fontSize(14)
        .fillColor('rgba(255,255,255,0.8)')
        .text('Industrial Real Estate Consultant', 60, 180);

      let contactY = 220;
      if (user.phone) {
        doc
          .font('Roboto')
          .fontSize(13)
          .fillColor(WHITE)
          .text(`T: ${user.phone}`, 60, contactY);
        contactY += 22;
      }
      doc
        .font('Roboto')
        .fontSize(13)
        .fillColor(WHITE)
        .text(`E: ${user.email}`, 60, contactY);
      contactY += 22;

      if (agency.address) {
        contactY += 15;
        doc
          .font('Roboto')
          .fontSize(11)
          .fillColor('rgba(255,255,255,0.7)')
          .text(agency.address, 60, contactY, { width: 400 });
      }
    }

    // Agency logo (right side, large)
    if (agency.logo) {
      const logoBuf = this.loadLocalImage(agency.logo);
      if (logoBuf) {
        try {
          doc.image(logoBuf, SLIDE_W - 300, 120, {
            fit: [220, 120],
            align: 'center',
            valign: 'center',
          });
        } catch {
          // Fallback to text
          this.drawAgencyNameLarge(doc, agency, SLIDE_W - 300, 160);
        }
      } else {
        this.drawAgencyNameLarge(doc, agency, SLIDE_W - 300, 160);
      }
    } else {
      this.drawAgencyNameLarge(doc, agency, SLIDE_W - 300, 160);
    }

    // Disclaimer
    const companyName = deal.company?.name || 'the client';
    doc
      .font('Roboto')
      .fontSize(7)
      .fillColor('rgba(255,255,255,0.5)')
      .text(
        `This presentation was created exclusively for internal use of ${companyName}. ` +
          'Any dissemination, distribution, copying, or other use of this information without prior written consent is strictly prohibited.',
        40,
        SLIDE_H - 45,
        { width: SLIDE_W - 80, align: 'center' },
      );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private aggregateSpecs(building: BuildingData): AggregatedSpecs {
    const units = building.units || [];

    let warehouseSqm = 0;
    let warehouseWeightedRent = 0;
    let officeSanitarySqm = 0;
    let officeSanitaryWeightedRent = 0;
    let docks = 0;
    let driveins = 0;
    let sprinkler = false;
    let hydrantSystem = false;
    let isuAuthorization = false;

    // First-unit values
    const first = units[0];

    for (const u of units) {
      const ws = u.warehouseSpace as { sqm: number; rentPrice: number } | null;
      const os = u.officeSpace as { sqm: number; rentPrice: number } | null;
      const ss = u.sanitarySpace as { sqm: number; rentPrice: number } | null;

      if (ws?.sqm) {
        warehouseWeightedRent += (ws.rentPrice || 0) * ws.sqm;
        warehouseSqm += ws.sqm;
      }
      if (os?.sqm) {
        officeSanitaryWeightedRent += (os.rentPrice || 0) * os.sqm;
        officeSanitarySqm += os.sqm;
      }
      if (ss?.sqm) {
        officeSanitaryWeightedRent += (ss.rentPrice || 0) * ss.sqm;
        officeSanitarySqm += ss.sqm;
      }

      docks += u.docks || 0;
      driveins += u.driveins || 0;
      if (u.sprinkler) sprinkler = true;
      if (u.hydrantSystem) hydrantSystem = true;
      if (u.isuAuthorization) isuAuthorization = true;
    }

    // Format availability date
    let availableFrom: string | null = null;
    if (first?.availableFrom) {
      const d = new Date(first.availableFrom);
      if (!isNaN(d.getTime())) {
        availableFrom = d.toLocaleDateString('en-GB', {
          month: 'long',
          year: 'numeric',
        });
      }
    }

    // Grid dimensions: combine gridStructure + gridFormat
    let gridDimensions: string | null = null;
    if (first?.gridStructure) {
      gridDimensions = first.gridStructure;
      if (first.gridFormat) gridDimensions += ' ' + first.gridFormat;
    }

    // For SALE: aggregate sale price (sum across units if multiple)
    let salePrice: number | null = null;
    let salePriceVatIncluded = false;
    for (const u of units) {
      if (u.salePrice != null && u.salePrice > 0) {
        salePrice = (salePrice || 0) + u.salePrice;
        if (u.salePriceVatIncluded) salePriceVatIncluded = true;
      }
    }

    return {
      warehouseSqm,
      warehouseRent:
        warehouseSqm > 0 ? warehouseWeightedRent / warehouseSqm : 0,
      officeSanitarySqm,
      officeSanitaryRent:
        officeSanitarySqm > 0
          ? officeSanitaryWeightedRent / officeSanitarySqm
          : 0,
      serviceCharge: first?.serviceCharge ?? null,
      contractLength: first?.contractLength ?? null,
      availableFrom,
      salePrice,
      salePriceVatIncluded,
      expandingPossibilities:
        first?.expandingPossibilities ??
        building.expandingPossibilities ??
        null,
      clearHeight: first?.usefulHeight ?? null,
      temperature: first?.temperature ?? null,
      docks,
      driveins,
      sprinkler,
      hydrantSystem,
      isuAuthorization,
      heating: first?.heating ?? null,
      buildingStructure: first?.buildingStructure ?? null,
      gridDimensions,
      floorLoading: first?.floorLoading ?? null,
      lighting: first?.lighting ?? null,
    };
  }

  private drawSlideHeader(doc: any, title: string, subtitle: string) {
    // Teal accent line at top
    doc.rect(0, 0, SLIDE_W, 4).fill(this.BRAND);

    // Title right-aligned area
    doc
      .font('Roboto-Bold')
      .fontSize(16)
      .fillColor(DARK)
      .text(title, 40, 20, { width: SLIDE_W - 80 });

    if (subtitle) {
      doc
        .font('Roboto')
        .fontSize(10)
        .fillColor(GRAY)
        .text(subtitle, 40, 42, { width: SLIDE_W - 80 });
    }
  }

  private drawSpecTable(
    doc: any,
    rows: [string, string][],
    x: number,
    startY: number,
    width: number,
  ): number {
    let y = startY;
    const labelW = 180;

    for (let i = 0; i < rows.length; i++) {
      const [label, value] = rows[i];
      // Alternating row bg
      if (i % 2 === 0) {
        doc.rect(x, y - 2, width, 18).fill(BG_LIGHT);
      }

      doc
        .font('Roboto')
        .fontSize(9)
        .fillColor(GRAY)
        .text(label, x + 8, y, { width: labelW });

      doc
        .font('Roboto-Bold')
        .fontSize(9)
        .fillColor(DARK)
        .text(value, x + labelW + 8, y, { width: width - labelW - 16 });

      y += 18;
    }

    return y;
  }

  private layoutPhotos(
    doc: any,
    photos: Buffer[],
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    const gap = 8;

    try {
      if (photos.length === 1) {
        doc.image(photos[0], x, y, { fit: [w, h], align: 'center', valign: 'center' });
      } else if (photos.length === 2) {
        const halfW = (w - gap) / 2;
        doc.image(photos[0], x, y, { fit: [halfW, h], align: 'center', valign: 'center' });
        doc.image(photos[1], x + halfW + gap, y, { fit: [halfW, h], align: 'center', valign: 'center' });
      } else if (photos.length === 3) {
        const leftW = w * 0.6;
        const rightW = w - leftW - gap;
        const halfH = (h - gap) / 2;
        doc.image(photos[0], x, y, { fit: [leftW, h], align: 'center', valign: 'center' });
        doc.image(photos[1], x + leftW + gap, y, { fit: [rightW, halfH], align: 'center', valign: 'center' });
        doc.image(photos[2], x + leftW + gap, y + halfH + gap, { fit: [rightW, halfH], align: 'center', valign: 'center' });
      } else {
        // 2x2 grid
        const halfW = (w - gap) / 2;
        const halfH = (h - gap) / 2;
        if (photos[0]) doc.image(photos[0], x, y, { fit: [halfW, halfH], align: 'center', valign: 'center' });
        if (photos[1]) doc.image(photos[1], x + halfW + gap, y, { fit: [halfW, halfH], align: 'center', valign: 'center' });
        if (photos[2]) doc.image(photos[2], x, y + halfH + gap, { fit: [halfW, halfH], align: 'center', valign: 'center' });
        if (photos[3]) doc.image(photos[3], x + halfW + gap, y + halfH + gap, { fit: [halfW, halfH], align: 'center', valign: 'center' });
      }
    } catch (err) {
      this.logger.warn('Failed to render photos in PDF', err);
    }
  }

  private drawAgencyBranding(
    doc: any,
    agency: AgencyData,
    x: number,
    y: number,
    color: string,
  ) {
    if (agency.logo) {
      const logoBuf = this.loadLocalImage(agency.logo);
      if (logoBuf) {
        try {
          doc.image(logoBuf, x, y - 20, { fit: [120, 30], align: 'left', valign: 'center' });
          return;
        } catch {
          // Fall through to text
        }
      }
    }
    doc
      .font('Roboto-Bold')
      .fontSize(12)
      .fillColor(color)
      .text(agency.name || 'MapEstate', x, y - 12);
  }

  private drawAgencyNameLarge(doc: any, agency: AgencyData, x: number, y: number) {
    doc
      .font('Roboto-Bold')
      .fontSize(36)
      .fillColor(WHITE)
      .text(agency.name || 'MapEstate', x, y, { width: 220, align: 'center' });
  }

  private drawImagePlaceholder(
    doc: any,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    doc.rect(x, y, w, h).fill(BG_LIGHT);
    doc
      .font('Roboto')
      .fontSize(11)
      .fillColor(LIGHT_GRAY)
      .text('Satellite view', x, y + h / 2 - 6, {
        width: w,
        align: 'center',
      });
  }

  private async loadImage(filePath: string): Promise<Buffer | null> {
    if (!filePath) return null;

    // Check cache first (used for pre-fetched agency images)
    if (this.imageCache.has(filePath)) {
      return this.imageCache.get(filePath) || null;
    }

    // Handle external URLs
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      try {
        const res = await fetch(filePath);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      } catch {
        // Silently fail
      }
      return null;
    }

    // Local file
    return this.loadLocalImage(filePath);
  }

  private loadLocalImage(filePath: string): Buffer | null {
    if (!filePath) return null;

    // Check cache
    if (this.imageCache.has(filePath)) {
      return this.imageCache.get(filePath) || null;
    }

    // Skip external URLs
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return null;
    }

    // Handle upload paths (e.g., "/api/uploads/abc.jpg", "/uploads/abc.jpg")
    let localPath = filePath;
    if (filePath.startsWith('/api/uploads/')) {
      localPath = path.resolve(this.uploadDir, filePath.replace('/api/uploads/', ''));
    } else if (filePath.startsWith('/uploads/')) {
      localPath = path.resolve(this.uploadDir, filePath.replace('/uploads/', ''));
    } else if (filePath.startsWith('uploads/')) {
      localPath = path.resolve(this.uploadDir, filePath.replace('uploads/', ''));
    } else if (!path.isAbsolute(filePath)) {
      localPath = path.resolve(this.uploadDir, filePath);
    }

    try {
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
    } catch {
      // Silently fail
    }
    return null;
  }

  private getCityName(deal: DealData): string {
    if (deal.locations && deal.locations.length > 0) {
      return deal.locations[0].name;
    }
    return '';
  }

  private fmtNum(n: number): string {
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
}
