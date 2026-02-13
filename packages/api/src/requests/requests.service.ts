import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RequestStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateColdSalesDto } from './dto/create-cold-sales.dto';

const TERMINAL_STATUSES: RequestStatus[] = [
  RequestStatus.WON,
  RequestStatus.LOST,
];

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findMyRequests(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.propertyRequest.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          company: true,
          person: true,
          locations: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.propertyRequest.count({ where: { userId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMyBoard(userId: number) {
    const requests = await this.prisma.propertyRequest.findMany({
      where: { userId },
      include: {
        company: true,
        person: true,
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

  async getActiveStats(userId: number) {
    const where = {
      userId,
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

  async getClosedStats(userId: number) {
    const count = await this.prisma.propertyRequest.count({
      where: {
        userId,
        status: { in: TERMINAL_STATUSES },
      },
    });

    return { closedRequests: count };
  }

  async findOne(id: number) {
    const request = await this.prisma.propertyRequest.findUnique({
      where: { id },
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

    return request;
  }

  async update(id: number, dto: UpdateRequestDto) {
    const existing = await this.findOne(id);
    const { locationIds, ...data } = dto;

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

    return request;
  }

  async remove(id: number) {
    const request = await this.findOne(id);

    if (request.offers.length > 0) {
      throw new BadRequestException(
        'Cannot delete request with attached offers. Remove offers first.',
      );
    }

    await this.prisma.propertyRequest.delete({ where: { id } });

    await this.recalculateDealCounts(request.companyId, request.personId);

    return { message: 'Request deleted successfully' };
  }

  async filter(
    filters: Record<string, unknown>,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

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

  async updateStatus(id: number, dto: UpdateStatusDto) {
    const existing = await this.findOne(id);

    if (TERMINAL_STATUSES.includes(existing.status)) {
      throw new BadRequestException(
        `Request is already in terminal status: ${existing.status}`,
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

    return request;
  }

  async findMatches(id: number) {
    const request = await this.prisma.propertyRequest.findUnique({
      where: { id },
      include: { locations: true },
    });

    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    // Load buildings filtered by transactionType matching requestType
    const buildingWhere: Record<string, unknown> = {};
    if (request.requestType) {
      buildingWhere.transactionType = request.requestType;
    }

    const buildings = await this.prisma.building.findMany({
      where: buildingWhere,
      include: { location: true },
    });

    const requestLocationIds = request.locations.map((l) => l.id);
    const requestLocationCounties = request.locations.map((l) => l.county);

    const results = buildings.map((building) => {
      // SQM score (35% weight)
      let sqmScore: number;
      if (request.numberOfSqm && building.availableSqm) {
        const diff = Math.abs(building.availableSqm - request.numberOfSqm);
        const tolerance = request.numberOfSqm * 0.3;
        sqmScore =
          diff <= tolerance ? Math.round((1 - diff / tolerance) * 100) : 0;
      } else {
        sqmScore = 50;
      }

      // Location score (40% weight)
      let locationScore: number;
      if (requestLocationIds.length === 0) {
        locationScore = 50;
      } else if (
        building.locationId &&
        requestLocationIds.includes(building.locationId)
      ) {
        locationScore = 100;
      } else if (
        building.location &&
        requestLocationCounties.includes(building.location.county)
      ) {
        locationScore = 50;
      } else {
        locationScore = 0;
      }

      // Availability score (25% weight)
      let availabilityScore = 50;
      if (request.startDate && building.availableFrom) {
        const diffMs =
          building.availableFrom.getTime() - request.startDate.getTime();
        const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30);
        if (diffMonths <= 0) {
          availabilityScore = 100;
        } else if (diffMonths <= 3) {
          availabilityScore = 50;
        } else {
          availabilityScore = 0;
        }
      }

      const score = Math.round(
        sqmScore * 0.35 + locationScore * 0.4 + availabilityScore * 0.25,
      );

      return {
        building: {
          id: building.id,
          name: building.name,
          address: building.address,
          availableSqm: building.availableSqm,
          transactionType: building.transactionType,
          serviceCharge: building.serviceCharge,
          availableFrom: building.availableFrom,
          location: building.location,
          latitude: building.latitude,
          longitude: building.longitude,
        },
        score,
        breakdown: {
          sqm: sqmScore,
          location: locationScore,
          availability: availabilityScore,
        },
      };
    });

    return results
      .filter((r) => r.score >= 40)
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
          name: `Cold Sales - ${person.company?.name || person.name}`,
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
