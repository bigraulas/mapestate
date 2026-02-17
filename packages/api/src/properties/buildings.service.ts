import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Injectable()
export class BuildingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 20,
    locationId?: number,
    transactionType?: string,
    agencyId?: number | null,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.BuildingWhereInput = {};

    if (locationId) {
      where.locationId = locationId;
    }

    if (transactionType) {
      where.transactionType = transactionType as Prisma.EnumTransactionTypeFilter['equals'];
    }

    if (agencyId) {
      where.user = { agencyId };
    }

    const [data, total] = await Promise.all([
      this.prisma.building.findMany({
        where,
        skip,
        take: limit,
        include: {
          location: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          developer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.building.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findForMap(agencyId?: number | null) {
    return this.prisma.building.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        ...(agencyId ? { user: { agencyId } } : {}),
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        availableSqm: true,
        transactionType: true,
        address: true,
        location: {
          select: {
            id: true,
            name: true,
            county: true,
          },
        },
        units: {
          select: {
            id: true,
            name: true,
            warehousePrice: true,
            officePrice: true,
            maintenancePrice: true,
            hasOffice: true,
            officeSqm: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        units: true,
        location: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        developer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!building) {
      throw new NotFoundException(`Building with ID ${id} not found`);
    }

    return building;
  }

  async create(dto: CreateBuildingDto, userId: number) {
    return this.prisma.building.create({
      data: {
        ...dto,
        userId,
        polygonPoints: dto.polygonPoints
          ? (dto.polygonPoints as Prisma.InputJsonValue)
          : undefined,
        availableFrom: dto.availableFrom
          ? new Date(dto.availableFrom)
          : undefined,
      },
      include: {
        location: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        developer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async update(id: number, dto: UpdateBuildingDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = { ...dto };

    if (dto.polygonPoints !== undefined) {
      data.polygonPoints = dto.polygonPoints;
    }

    if (dto.availableFrom !== undefined) {
      data.availableFrom = dto.availableFrom
        ? new Date(dto.availableFrom)
        : null;
    }

    return this.prisma.building.update({
      where: { id },
      data,
      include: {
        location: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        developer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.building.delete({
      where: { id },
    });
  }

  async filter(filterDto: Record<string, unknown>, agencyId?: number | null) {
    const where: Prisma.BuildingWhereInput = {};

    if (agencyId) {
      where.user = { agencyId };
    }

    if (filterDto.locationId) {
      where.locationId = filterDto.locationId as number;
    }

    if (filterDto.transactionType) {
      where.transactionType =
        filterDto.transactionType as Prisma.EnumTransactionTypeFilter['equals'];
    }

    if (filterDto.minSqm || filterDto.maxSqm) {
      where.availableSqm = {};
      if (filterDto.minSqm) {
        where.availableSqm.gte = filterDto.minSqm as number;
      }
      if (filterDto.maxSqm) {
        where.availableSqm.lte = filterDto.maxSqm as number;
      }
    }

    if (filterDto.sprinkler !== undefined) {
      where.sprinkler = filterDto.sprinkler as boolean;
    }

    if (filterDto.buildToSuit !== undefined) {
      where.buildToSuit = filterDto.buildToSuit as boolean;
    }

    if (filterDto.search) {
      where.OR = [
        { name: { contains: filterDto.search as string, mode: 'insensitive' } },
        {
          address: {
            contains: filterDto.search as string,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (filterDto.developerId) {
      where.developerId = filterDto.developerId as number;
    }

    const page = (filterDto.page as number) || 1;
    const limit = (filterDto.limit as number) || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.building.findMany({
        where,
        skip,
        take: limit,
        include: {
          location: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          developer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.building.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reassign(id: number, newUserId: number, adminUserId: number) {
    const building = await this.findOne(id);
    const oldUserId = building.userId;

    // Update building and all its units
    const [updated] = await Promise.all([
      this.prisma.building.update({
        where: { id },
        data: { userId: newUserId },
        include: {
          location: true,
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          developer: { select: { id: true, name: true } },
        },
      }),
      this.prisma.unit.updateMany({
        where: { buildingId: id },
        data: { userId: newUserId },
      }),
    ]);

    await this.auditService.log('REASSIGN', 'BUILDING', id, adminUserId, {
      fromUserId: oldUserId,
      toUserId: newUserId,
    });

    return updated;
  }
}
