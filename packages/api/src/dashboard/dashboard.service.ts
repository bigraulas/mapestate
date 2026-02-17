import { Injectable } from '@nestjs/common';
import { RequestStatus, Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

const TERMINAL_STATUSES: RequestStatus[] = [
  RequestStatus.WON,
  RequestStatus.LOST,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(userId: number | null, agencyId?: number | null) {
    const userFilter: Record<string, unknown> = userId != null ? { userId } : {};
    if (agencyId && userId == null) {
      userFilter.user = { agencyId };
    }
    const activeWhere = {
      ...userFilter,
      status: { notIn: TERMINAL_STATUSES },
    };

    const [activeRequests, aggregates, closedDealsCount] = await Promise.all([
      this.prisma.propertyRequest.count({ where: activeWhere }),
      this.prisma.propertyRequest.aggregate({
        where: activeWhere,
        _sum: { estimatedFeeValue: true, numberOfSqm: true },
      }),
      this.prisma.propertyRequest.count({
        where: { ...userFilter, status: RequestStatus.WON },
      }),
    ]);

    return {
      activeRequests,
      totalEstimatedFee: aggregates._sum.estimatedFeeValue ?? 0,
      totalSqm: aggregates._sum.numberOfSqm ?? 0,
      closedDealsCount,
    };
  }

  async getMonthlySales(userId: number | null, agencyId?: number | null) {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const userFilter: Record<string, unknown> = userId != null ? { userId } : {};
    if (agencyId && userId == null) {
      userFilter.user = { agencyId };
    }

    const closedRequests = await this.prisma.propertyRequest.findMany({
      where: {
        ...userFilter,
        status: { in: TERMINAL_STATUSES },
        closedAt: {
          gte: startOfYear,
          lt: endOfYear,
        },
      },
      select: {
        status: true,
        closedAt: true,
      },
    });

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const monthlySales = months.map((month, index) => {
      const monthRequests = closedRequests.filter(
        (r) => r.closedAt && r.closedAt.getMonth() === index,
      );

      return {
        month,
        won: monthRequests.filter((r) => r.status === RequestStatus.WON)
          .length,
        lost: monthRequests.filter((r) => r.status === RequestStatus.LOST)
          .length,
      };
    });

    return monthlySales;
  }

  async getPipeline(userId: number | null, agencyId?: number | null) {
    const statusValues = Object.values(RequestStatus);
    const userFilter: Record<string, unknown> = userId != null ? { userId } : {};
    if (agencyId && userId == null) {
      userFilter.user = { agencyId };
    }

    const counts = await Promise.all(
      statusValues.map(async (status) => {
        const count = await this.prisma.propertyRequest.count({
          where: { ...userFilter, status },
        });
        return { status, count };
      }),
    );

    return counts;
  }

  async getExpiringLeases(userId: number | null, agencyId?: number | null) {
    const now = new Date();
    const in12Months = new Date();
    in12Months.setMonth(in12Months.getMonth() + 12);

    const tenantWhere: Record<string, unknown> = {
      endDate: {
        gte: now,
        lte: in12Months,
      },
    };
    if (agencyId && userId == null) {
      tenantWhere.unit = { building: { user: { agencyId } } };
    }

    const tenants = await this.prisma.tenant.findMany({
      where: tenantWhere,
      include: {
        unit: {
          include: {
            building: {
              include: { location: true },
            },
          },
        },
        company: true,
      },
      orderBy: { endDate: 'asc' },
    });

    return tenants.map((tenant) => {
      const daysUntilExpiry = Math.ceil(
        (tenant.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      let priority: 'critical' | 'warning' | 'normal';
      if (daysUntilExpiry <= 90) {
        priority = 'critical';
      } else if (daysUntilExpiry <= 180) {
        priority = 'warning';
      } else {
        priority = 'normal';
      }

      return {
        id: tenant.id,
        company: tenant.company,
        unit: tenant.unit,
        building: tenant.unit.building,
        startDate: tenant.startDate,
        endDate: tenant.endDate,
        daysUntilExpiry,
        priority,
      };
    });
  }

  async getBrokerPerformance(agencyId?: number | null) {
    const brokers = await this.prisma.user.findMany({
      where: agencyId ? { agencyId } : {},
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: { firstName: 'asc' },
    });

    const stats = await Promise.all(
      brokers.map(async (broker) => {
        const [activeDeals, wonDeals, lostDeals, feeAggregate] = await Promise.all([
          this.prisma.propertyRequest.count({
            where: {
              userId: broker.id,
              status: { notIn: TERMINAL_STATUSES },
            },
          }),
          this.prisma.propertyRequest.count({
            where: { userId: broker.id, status: RequestStatus.WON },
          }),
          this.prisma.propertyRequest.count({
            where: { userId: broker.id, status: RequestStatus.LOST },
          }),
          this.prisma.propertyRequest.aggregate({
            where: { userId: broker.id, status: RequestStatus.WON },
            _sum: { estimatedFeeValue: true },
          }),
        ]);

        return {
          id: broker.id,
          name: `${broker.firstName} ${broker.lastName}`,
          email: broker.email,
          activeDeals,
          wonDeals,
          lostDeals,
          estimatedFee: feeAggregate._sum.estimatedFeeValue ?? 0,
        };
      }),
    );

    return stats;
  }
}
