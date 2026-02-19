import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    user: {
      select: { id: true, firstName: true, lastName: true, email: true },
    },
    company: true,
    request: true,
    persons: true,
  };

  async findAll(page: number = 1, limit: number = 20, agencyId?: number | null) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (agencyId) {
      where.user = { agencyId };
    }

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take: limit,
        include: this.includeRelations,
        orderBy: { date: 'desc' },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMyDone(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where = { userId, done: true };

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take: limit,
        include: this.includeRelations,
        orderBy: { date: 'desc' },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMyOverdue(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const where = {
      userId,
      done: false,
      date: { lt: now },
    };

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take: limit,
        include: this.includeRelations,
        orderBy: { date: 'asc' },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMyPlanned(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const where = {
      userId,
      done: false,
      date: { gte: now },
    };

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take: limit,
        include: this.includeRelations,
        orderBy: { date: 'asc' },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOverdueCount(userId: number) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const count = await this.prisma.activity.count({
      where: {
        userId,
        done: false,
        date: { lt: now },
      },
    });

    return { overdueCount: count };
  }

  async findOne(id: number) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: this.includeRelations,
    });

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    return activity;
  }

  async create(dto: CreateActivityDto, userId: number) {
    const { personIds, ...data } = dto;

    return this.prisma.activity.create({
      data: {
        ...data,
        date: new Date(data.date),
        userId,
        persons: personIds?.length
          ? { connect: personIds.map((id) => ({ id })) }
          : undefined,
      },
      include: this.includeRelations,
    });
  }

  async update(id: number, dto: UpdateActivityDto) {
    await this.findOne(id);

    const { personIds, ...data } = dto;

    const updateData: Record<string, unknown> = { ...data };
    if (data.date) {
      updateData.date = new Date(data.date);
    }

    if (personIds !== undefined) {
      updateData.persons = {
        set: personIds.map((pid) => ({ id: pid })),
      };
    }

    return this.prisma.activity.update({
      where: { id },
      data: updateData,
      include: this.includeRelations,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.activity.delete({ where: { id } });
    return { message: 'Activity deleted successfully' };
  }

  async logSystem(params: {
    title: string;
    activityType: 'NOTE' | 'EMAIL';
    requestId?: number;
    companyId?: number;
    userId: number;
    notes?: string;
  }) {
    return this.prisma.activity.create({
      data: {
        title: params.title,
        date: new Date(),
        activityType: params.activityType,
        isSystem: true,
        done: true,
        userId: params.userId,
        requestId: params.requestId,
        companyId: params.companyId,
        notes: params.notes,
      },
    });
  }

  async filter(
    filters: Record<string, unknown>,
    page: number = 1,
    limit: number = 20,
    agencyId?: number | null,
  ) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (agencyId) {
      where.user = { agencyId };
    }

    if (filters.activityType) {
      where.activityType = filters.activityType;
    }

    if (filters.done !== undefined) {
      where.done = filters.done;
    }

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.requestId) {
      where.requestId = filters.requestId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        (where.date as Record<string, unknown>).gte = new Date(
          filters.dateFrom as string,
        );
      }
      if (filters.dateTo) {
        (where.date as Record<string, unknown>).lte = new Date(
          filters.dateTo as string,
        );
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take: limit,
        include: this.includeRelations,
        orderBy: { date: 'desc' },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
