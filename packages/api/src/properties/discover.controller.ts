import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DiscoverService, DiscoveredProperty } from './discover.service';
import { BuildingsService } from './buildings.service';

@Controller('properties/discover')
@UseGuards(AuthGuard('jwt'))
export class DiscoverController {
  constructor(
    private readonly discoverService: DiscoverService,
    private readonly buildingsService: BuildingsService,
  ) {}

  /**
   * GET /api/properties/discover
   * Fetch industrial properties from OpenStreetMap.
   * Optional query params: south, west, north, east (bounding box)
   */
  @Get()
  async discover(
    @Query('south') south?: string,
    @Query('west') west?: string,
    @Query('north') north?: string,
    @Query('east') east?: string,
    @Query('refresh') refresh?: string,
  ): Promise<DiscoveredProperty[]> {
    const bounds =
      south && west && north && east
        ? {
            south: parseFloat(south),
            west: parseFloat(west),
            north: parseFloat(north),
            east: parseFloat(east),
          }
        : undefined;

    return this.discoverService.discoverProperties(
      bounds,
      refresh === 'true',
    );
  }

  /**
   * POST /api/properties/discover/import
   * Import a discovered property into the CRM as a Building.
   */
  @Post('import')
  async importProperty(
    @Body()
    body: {
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
      locationId: number;
      transactionType?: string;
      ownerName?: string;
      ownerPhone?: string;
      ownerEmail?: string;
      minContractYears?: number;
    },
    @Request() req: { user: { id: number } },
  ) {
    const building = await this.buildingsService.create(
      {
        name: body.name,
        address: body.address || undefined,
        latitude: body.lat,
        longitude: body.lng,
        totalSqm: body.sqm || undefined,
        availableSqm: body.sqm || undefined,
        transactionType: (body.transactionType as 'RENT' | 'SALE') || 'RENT',
        locationId: body.locationId,
        osmId: body.osmId,
        ownerName: body.ownerName || undefined,
        ownerPhone: body.ownerPhone || undefined,
        ownerEmail: body.ownerEmail || undefined,
        minContractYears: body.minContractYears || undefined,
        description: `Importat din OpenStreetMap (OSM ID: ${body.osmId}). Tip: ${body.type}${body.operator ? `. Operator: ${body.operator}` : ''}`,
      },
      req.user.id,
    );
    return building;
  }
}
