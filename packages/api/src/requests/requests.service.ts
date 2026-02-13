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
