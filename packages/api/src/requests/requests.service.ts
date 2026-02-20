import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RequestStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateColdSalesDto } from './dto/create-cold-sales.dto';

const TERMINAL_STATUSES: RequestStatus[] = [
  RequestStatus.WON,
  RequestStatus.LOST,
];

const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.NEW]: [RequestStatus.OFFERING, RequestStatus.LOST, RequestStatus.ON_HOLD],
  [RequestStatus.OFFERING]: [RequestStatus.TOUR, RequestStatus.SHORTLIST, RequestStatus.NEGOTIATION, RequestStatus.LOST, RequestStatus.ON_HOLD],
  [RequestStatus.TOUR]: [RequestStatus.SHORTLIST, RequestStatus.NEGOTIATION, RequestStatus.LOST, RequestStatus.ON_HOLD],
  [RequestStatus.SHORTLIST]: [RequestStatus.NEGOTIATION, RequestStatus.TOUR, RequestStatus.LOST, RequestStatus.ON_HOLD],
  [RequestStatus.NEGOTIATION]: [RequestStatus.HOT_SIGNED, RequestStatus.WON, RequestStatus.LOST, RequestStatus.ON_HOLD],
  [RequestStatus.HOT_SIGNED]: [RequestStatus.WON, RequestStatus.LOST, RequestStatus.ON_HOLD, RequestStatus.NEGOTIATION],
  [RequestStatus.ON_HOLD]: [RequestStatus.NEW, RequestStatus.OFFERING, RequestStatus.TOUR, RequestStatus.SHORTLIST, RequestStatus.NEGOTIATION, RequestStatus.HOT_SIGNED, RequestStatus.LOST],
  [RequestStatus.WON]: [],
  [RequestStatus.LOST]: [],
};

/**
 * Calculate great-circle distance between two points using the Haversine formula.
 * Returns distance in km.
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.propertyRequest.findMany({
        skip,
        take: limit,
        include: {
          company: true,
          person: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          locations: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.propertyRequest.count(),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMyRequests(userId: number | null, page: number = 1, limit: number = 20, agencyId?: number | null) {
    const skip = (page - 1) * limit;
    const userFilter: Record<string, unknown> = userId != null ? { userId } : {};
    if (agencyId) {
      userFilter.user = { agencyId };
    }

    const [data, total] = await Promise.all([
      this.prisma.propertyRequest.findMany({
        where: userFilter,
        skip,
        take: limit,
        include: {
          company: true,
          person: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          locations: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.propertyRequest.count({ where: userFilter }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMyBoard(userId: number | null, agencyId?: number | null) {
    const userFilter: Record<string, unknown> = userId != null ? { userId } : {};
    if (agencyId) {
      userFilter.user = { agencyId };
    }

    const requests = await this.prisma.propertyRequest.findMany({
      where: userFilter,
      include: {
        company: true,
        person: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        locations: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const statusValues = Object.values(RequestStatus);
    const board = statusValues.map((status) => ({
      status,
      requests: requests.filter((r) => r.status === status),
    }));

    return board;
  }

  async getActiveStats(userId: number | null, agencyId?: number | null) {
    const userFilter: Record<string, unknown> = userId != null ? { userId } : {};
    if (agencyId) {
      userFilter.user = { agencyId };
    }
    const where = {
      ...userFilter,
      status: { notIn: TERMINAL_STATUSES },
    };

    const [count, aggregates] = await Promise.all([
      this.prisma.propertyRequest.count({ where }),
      this.prisma.propertyRequest.aggregate({
        where,
        _sum: { estimatedFeeValue: true, numberOfSqm: true },
      }),
    ]);

    return {
      activeRequests: count,
      totalEstimatedFee: aggregates._sum.estimatedFeeValue ?? 0,
      totalSqm: aggregates._sum.numberOfSqm ?? 0,
    };
  }

  async getClosedStats(userId: number | null, agencyId?: number | null) {
    const userFilter: Record<string, unknown> = userId != null ? { userId } : {};
    if (agencyId) {
      userFilter.user = { agencyId };
    }
    const count = await this.prisma.propertyRequest.count({
      where: {
        ...userFilter,
        status: { in: TERMINAL_STATUSES },
      },
    });

    return { closedRequests: count };
  }

  async findOne(id: number, agencyId?: number) {
    const request = await this.prisma.propertyRequest.findFirst({
      where: { id, ...(agencyId ? { user: { agencyId } } : {}) },
      include: {
        company: true,
        person: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        locations: true,
        offers: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    return request;
  }

  async create(dto: CreateRequestDto, userId: number) {
    const { locationIds, ...data } = dto;

    // Convert date-only string to proper DateTime for Prisma
    if (data.startDate && typeof data.startDate === 'string') {
      (data as any).startDate = new Date(data.startDate);
    }

    const request = await this.prisma.propertyRequest.create({
      data: {
        ...data,
        userId,
        locations: locationIds?.length
          ? { connect: locationIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        company: true,
        person: true,
        locations: true,
      },
    });

    await this.recalculateDealCounts(request.companyId, request.personId);

    await this.auditService.log('CREATE', 'DEAL', request.id, userId, {
      name: request.name,
      type: dto.requestType,
    });

    await this.activitiesService.logSystem({
      title: 'Deal creat',
      activityType: 'NOTE',
      requestId: request.id,
      companyId: request.companyId ?? undefined,
      userId,
    });

    return request;
  }

  async update(id: number, dto: UpdateRequestDto, userId?: number, agencyId?: number) {
    const existing = await this.findOne(id, agencyId);
    const { locationIds, ...data } = dto;

    // Convert date-only string to proper DateTime for Prisma
    if (data.startDate && typeof data.startDate === 'string') {
      (data as any).startDate = new Date(data.startDate);
    }

    const request = await this.prisma.propertyRequest.update({
      where: { id },
      data: {
        ...data,
        locations: locationIds
          ? {
              set: locationIds.map((lid) => ({ id: lid })),
            }
          : undefined,
      },
      include: {
        company: true,
        person: true,
        locations: true,
      },
    });

    // Recalculate for old and new company/person if changed
    const companyIds = new Set(
      [existing.companyId, request.companyId].filter(Boolean),
    );
    const personIds = new Set(
      [existing.personId, request.personId].filter(Boolean),
    );

    for (const cid of companyIds) {
      await this.recalculateDealCounts(cid!, null);
    }
    for (const pid of personIds) {
      await this.recalculateDealCounts(null, pid!);
    }

    if (userId) {
      await this.auditService.log('UPDATE', 'DEAL', id, userId, {
        name: request.name,
      });
    }

    return request;
  }

  async remove(id: number, userId?: number, agencyId?: number) {
    const request = await this.findOne(id, agencyId);

    if (request.offers.length > 0) {
      throw new BadRequestException(
        'Cannot delete request with attached offers. Remove offers first.',
      );
    }

    await this.prisma.propertyRequest.delete({ where: { id } });

    await this.recalculateDealCounts(request.companyId, request.personId);

    if (userId) {
      await this.auditService.log('DELETE', 'DEAL', id, userId, {
        name: request.name,
      });
    }

    return { message: 'Request deleted successfully' };
  }

  async filter(
    filters: Record<string, unknown>,
    page: number = 1,
    limit: number = 20,
    userId: number | null = null,
    agencyId?: number | null,
  ) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (userId != null) {
      where.userId = userId;
    }
    if (agencyId) {
      where.user = { agencyId };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.requestType) {
      where.requestType = filters.requestType;
    }

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.personId) {
      where.personId = filters.personId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    // Apply 15% margin on sqm filter
    if (filters.numberOfSqm) {
      const sqm = Number(filters.numberOfSqm);
      const margin = sqm * 0.15;
      where.numberOfSqm = {
        gte: Math.round(sqm - margin),
        lte: Math.round(sqm + margin),
      };
    }

    if (filters.locationId) {
      where.locations = { some: { id: Number(filters.locationId) } };
    }

    if (filters.startDateFrom || filters.startDateTo) {
      where.startDate = {};
      if (filters.startDateFrom) {
        (where.startDate as Record<string, unknown>).gte = new Date(
          filters.startDateFrom as string,
        );
      }
      if (filters.startDateTo) {
        (where.startDate as Record<string, unknown>).lte = new Date(
          filters.startDateTo as string,
        );
      }
    }

    if (filters.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.propertyRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: true,
          person: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          locations: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.propertyRequest.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateStatus(id: number, dto: UpdateStatusDto, userId?: number, agencyId?: number) {
    const existing = await this.findOne(id, agencyId);

    if (TERMINAL_STATUSES.includes(existing.status)) {
      throw new BadRequestException(
        `Request is already in terminal status: ${existing.status}`,
      );
    }

    const allowedNext = VALID_TRANSITIONS[existing.status] || [];
    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException(
        `Nu poti trece de la ${existing.status} la ${dto.status}`,
      );
    }

    if (dto.status === RequestStatus.LOST && !dto.lostReason) {
      throw new BadRequestException(
        'lostReason is required when setting status to LOST',
      );
    }

    const isClosing = TERMINAL_STATUSES.includes(dto.status);

    const request = await this.prisma.propertyRequest.update({
      where: { id },
      data: {
        status: dto.status,
        lostReason:
          dto.status === RequestStatus.LOST ? dto.lostReason : undefined,
        holdReason: dto.status === RequestStatus.ON_HOLD ? dto.holdReason : undefined,
        closedAt: isClosing ? new Date() : undefined,
        lastStatusChange: new Date(),
      },
      include: {
        company: true,
        person: true,
        locations: true,
      },
    });

    await this.recalculateDealCounts(request.companyId, request.personId);

    if (userId) {
      await this.auditService.log('STATUS_CHANGE', 'DEAL', id, userId, {
        from: existing.status,
        to: dto.status,
        name: request.name,
      });

      const statusLabel = dto.status === 'LOST'
        ? `Status: ${existing.status} → ${dto.status} (${dto.lostReason})`
        : `Status: ${existing.status} → ${dto.status}`;
      await this.activitiesService.logSystem({
        title: statusLabel,
        activityType: 'NOTE',
        requestId: id,
        companyId: request.companyId ?? undefined,
        userId: userId || request.userId,
        notes: dto.status === 'LOST' ? dto.lostReason : undefined,
      });
    }

    return request;
  }

  async findMatches(id: number, agencyId?: number | null) {
    const request = await this.prisma.propertyRequest.findUnique({
      where: { id },
      include: { locations: true },
    });

    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    // Load all buildings with units; filter by unit-level transactionType
    const buildings = await this.prisma.building.findMany({
      where: agencyId ? { user: { agencyId } } : {},
      include: { location: true, units: true },
    });

    const requestLocationIds = request.locations.map((l) => l.id);
    const requestLocationCounties = request.locations.map((l) => l.county);

    const results = buildings.map((building) => {
      // Filter units by transactionType if requestType is specified
      // RENT_AND_SALE units match both RENT and SALE requests
      const matchedUnits = request.requestType
        ? (building.units || []).filter(
            (u) =>
              u.transactionType === request.requestType ||
              u.transactionType === 'RENT_AND_SALE',
          )
        : building.units || [];

      // Skip buildings with no matching units when requestType is set
      if (request.requestType && matchedUnits.length === 0) {
        return null;
      }

      // ── SQM score (40% weight) - most important ──
      // Use sum of warehouseSpace sqm from matched units, fallback to building availableSqm
      const unitsSqm = matchedUnits.reduce((sum, u) => {
        const ws = u.warehouseSpace as { sqm?: number } | null;
        return sum + (ws?.sqm || 0);
      }, 0);
      const effectiveSqm = unitsSqm > 0 ? unitsSqm : building.availableSqm;

      let sqmScore: number;
      if (request.numberOfSqm && effectiveSqm) {
        const ratio = effectiveSqm / request.numberOfSqm;
        if (ratio >= 0.7 && ratio <= 2.0) {
          const deviation = ratio >= 1.0
            ? (ratio - 1.0) / 1.0
            : (1.0 - ratio) / 0.3;
          sqmScore = Math.round((1 - deviation * 0.7) * 100);
        } else {
          sqmScore = 0;
        }
      } else if (!request.numberOfSqm) {
        sqmScore = 50;
      } else {
        sqmScore = 0;
      }

      // ── Location score (40% weight) - most important ──
      let locationScore: number;
      const hasCircle =
        request.searchLat != null &&
        request.searchLng != null &&
        request.searchRadius != null &&
        request.searchRadius > 0;

      if (hasCircle && building.latitude != null && building.longitude != null) {
        // Circle-based distance matching
        const dist = haversineDistance(
          request.searchLat!,
          request.searchLng!,
          building.latitude,
          building.longitude,
        );
        if (dist <= request.searchRadius!) {
          // Linear falloff: center = 100, edge = 30
          locationScore = Math.round(100 - (dist / request.searchRadius!) * 70);
        } else if (dist <= request.searchRadius! * 1.3) {
          // Slight buffer beyond radius: partial score
          locationScore = 15;
        } else {
          locationScore = 0;
        }
      } else if (requestLocationIds.length === 0 && !hasCircle) {
        locationScore = 50; // No criteria specified, neutral
      } else if (
        building.locationId &&
        requestLocationIds.includes(building.locationId)
      ) {
        locationScore = 100; // Exact city match
      } else if (
        building.location &&
        requestLocationCounties.includes(building.location.county)
      ) {
        locationScore = 40; // Same county but different city
      } else {
        locationScore = 0; // Different region entirely
      }

      // ── Height score (20% weight when specified, else neutral) ──
      let heightScore = 50; // Neutral default when not specified
      if (request.minHeight) {
        const unitHeights = matchedUnits
          .map((u) => u.usefulHeight)
          .filter((h): h is number => h != null && h > 0);
        const maxHeight =
          unitHeights.length > 0
            ? Math.max(...unitHeights)
            : building.clearHeight ?? 0;

        if (maxHeight > 0) {
          if (maxHeight >= request.minHeight) {
            heightScore = 100;
          } else {
            const shortfall = (request.minHeight - maxHeight) / request.minHeight;
            heightScore = shortfall <= 0.2 ? Math.round((1 - shortfall * 3) * 100) : 0;
          }
        } else {
          heightScore = 30;
        }
      }

      // ── Weighted total: sqm 40% + location 40% + height 20% ──
      const score = request.minHeight
        ? Math.round(sqmScore * 0.4 + locationScore * 0.4 + heightScore * 0.2)
        : Math.round(sqmScore * 0.5 + locationScore * 0.5);

      // Compute max height from matched units for display
      const unitHeightsForDisplay = matchedUnits
        .map((u) => u.usefulHeight)
        .filter((h): h is number => h != null && h > 0);
      const displayHeight =
        unitHeightsForDisplay.length > 0
          ? Math.max(...unitHeightsForDisplay)
          : building.clearHeight ?? null;

      // Compute weighted-average warehouse rent price from matched units
      let whSqm = 0;
      let whWeightedRent = 0;
      for (const u of matchedUnits) {
        const ws = u.warehouseSpace as { sqm?: number; rentPrice?: number } | null;
        if (ws?.sqm && ws.sqm > 0) {
          whWeightedRent += (ws.rentPrice || 0) * ws.sqm;
          whSqm += ws.sqm;
        }
      }
      const rentPrice = whSqm > 0 ? Math.round((whWeightedRent / whSqm) * 100) / 100 : null;

      return {
        building: {
          id: building.id,
          name: building.name,
          address: building.address,
          availableSqm: effectiveSqm ?? building.availableSqm,
          transactionType: building.transactionType,
          serviceCharge: building.serviceCharge,
          rentPrice,
          availableFrom: building.availableFrom,
          clearHeight: displayHeight,
          location: building.location,
          latitude: building.latitude,
          longitude: building.longitude,
          unitsCount: matchedUnits.length,
          totalDocks: matchedUnits.reduce((sum, u) => sum + (u.docks || 0), 0),
        },
        score,
        breakdown: {
          sqm: sqmScore,
          location: locationScore,
          height: heightScore,
        },
      };
    });

    return results
      .filter((r): r is NonNullable<typeof r> => r != null && r.score >= 30)
      .sort((a, b) => b.score - a.score);
  }

  async createColdSales(dto: CreateColdSalesDto, userId: number) {
    const buildings = await this.prisma.building.findMany({
      where: { id: { in: dto.buildingIds } },
      include: { location: true },
    });

    const persons = await this.prisma.person.findMany({
      where: { id: { in: dto.recipientPersonIds } },
      include: { company: true },
    });

    if (buildings.length === 0) {
      throw new BadRequestException('No valid buildings found for the given IDs');
    }

    if (persons.length === 0) {
      throw new BadRequestException('No valid persons found for the given IDs');
    }

    const createdDeals = [];

    for (const person of persons) {
      const deal = await this.prisma.propertyRequest.create({
        data: {
          name: `Oferta - ${person.company?.name || person.name}`,
          dealType: 'COLD_SALES',
          userId,
          companyId: person.companyId,
          personId: person.id,
          status: 'OFFERING',
          lastStatusChange: new Date(),
        },
        include: {
          company: true,
          person: true,
          locations: true,
        },
      });

      await this.recalculateDealCounts(deal.companyId, deal.personId);
      createdDeals.push(deal);
    }

    return { deals: createdDeals, count: createdDeals.length };
  }

  async reassign(id: number, newUserId: number, adminUserId: number, agencyId?: number) {
    const request = await this.findOne(id, agencyId);
    const oldUserId = request.userId;

    const updated = await this.prisma.propertyRequest.update({
      where: { id },
      data: { userId: newUserId },
      include: {
        company: true,
        person: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        locations: true,
      },
    });

    await this.auditService.log('REASSIGN', 'DEAL', id, adminUserId, {
      fromUserId: oldUserId,
      toUserId: newUserId,
    });

    await this.activitiesService.logSystem({
      title: `Reasignat de la agentul #${oldUserId} la agentul #${newUserId}`,
      activityType: 'NOTE',
      requestId: id,
      companyId: updated.companyId ?? undefined,
      userId: adminUserId,
    });

    return updated;
  }

  async closeDeal(id: number, data: {
    agreedPrice: number;
    actualFee: number;
    signedDate: string;
    contractStartDate: string;
    contractEndDate?: string;
    wonBuildingId: number;
    wonUnitIds: number[];
    closureNotes?: string;
  }, userId: number, agencyId?: number) {
    const request = await this.findOne(id, agencyId);

    if (request.status !== RequestStatus.NEGOTIATION
        && request.status !== RequestStatus.HOT_SIGNED) {
      throw new BadRequestException(
        'Deal-ul trebuie sa fie in NEGOCIERE sau HOT SIGNED pentru a fi finalizat',
      );
    }

    const updated = await this.prisma.propertyRequest.update({
      where: { id },
      data: {
        status: RequestStatus.WON,
        closedAt: new Date(),
        lastStatusChange: new Date(),
        agreedPrice: data.agreedPrice,
        actualFee: data.actualFee,
        signedDate: new Date(data.signedDate),
        contractStartDate: new Date(data.contractStartDate),
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : undefined,
        wonBuildingId: data.wonBuildingId,
        wonUnitIds: data.wonUnitIds,
        closureNotes: data.closureNotes,
      },
      include: { company: true, person: true, locations: true },
    });

    if (updated.companyId && data.contractEndDate && data.wonUnitIds.length > 0) {
      for (const unitId of data.wonUnitIds) {
        await this.prisma.tenant.create({
          data: {
            unitId,
            companyId: updated.companyId,
            dealId: id,
            startDate: new Date(data.contractStartDate),
            endDate: new Date(data.contractEndDate),
          },
        });
      }
    }

    await this.recalculateDealCounts(updated.companyId, updated.personId);

    await this.auditService.log('CLOSE_WON', 'DEAL', id, userId, {
      agreedPrice: data.agreedPrice,
      actualFee: data.actualFee,
      wonBuildingId: data.wonBuildingId,
    });

    await this.activitiesService.logSystem({
      title: `Deal castigat! Pret: ${data.agreedPrice}€, Comision: ${data.actualFee}€`,
      activityType: 'NOTE',
      requestId: id,
      companyId: updated.companyId ?? undefined,
      userId,
    });

    return updated;
  }

  /**
   * Recalculate openDeals and closedDeals for a Company and/or Person.
   */
  private async recalculateDealCounts(
    companyId: number | null | undefined,
    personId: number | null | undefined,
  ) {
    if (companyId) {
      const [openDeals, closedDeals] = await Promise.all([
        this.prisma.propertyRequest.count({
          where: { companyId, status: { notIn: TERMINAL_STATUSES } },
        }),
        this.prisma.propertyRequest.count({
          where: { companyId, status: { in: TERMINAL_STATUSES } },
        }),
      ]);

      await this.prisma.company.update({
        where: { id: companyId },
        data: { openDeals, closedDeals },
      });
    }

    if (personId) {
      const [openDeals, closedDeals] = await Promise.all([
        this.prisma.propertyRequest.count({
          where: { personId, status: { notIn: TERMINAL_STATUSES } },
        }),
        this.prisma.propertyRequest.count({
          where: { personId, status: { in: TERMINAL_STATUSES } },
        }),
      ]);

      await this.prisma.person.update({
        where: { id: personId },
        data: { openDeals, closedDeals },
      });
    }
  }
}
