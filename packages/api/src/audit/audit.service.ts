import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    action: string,
    entity: string,
    entityId: number,
    userId: number,
    details?: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        userId,
        details: details ? (details as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    filters?: {
      entity?: string;
      userId?: number;
      dateFrom?: string;
      dateTo?: string;
      agencyId?: number | null;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (filters?.agencyId) {
      where.user = { agencyId: filters.agencyId };
    }

    if (filters?.entity) {
      where.entity = filters.entity;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(filters.dateTo);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
