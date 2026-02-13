import { Injectable } from '@nestjs/common';
import { RequestStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

const TERMINAL_STATUSES: RequestStatus[] = [
  RequestStatus.WON,
  RequestStatus.LOST,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(userId: number) {
    const activeWhere = {
      userId,
      status: { notIn: TERMINAL_STATUSES },
    };

    const [activeRequests, aggregates, closedDealsCount] = await Promise.all([
      this.prisma.propertyRequest.count({ where: activeWhere }),
      this.prisma.propertyRequest.aggregate({
        where: activeWhere,
        _sum: { estimatedFeeValue: true, numberOfSqm: true },
      }),
      this.prisma.propertyRequest.count({
        where: { userId, status: RequestStatus.WON },
      }),
    ]);

    return {
      activeRequests,
      totalEstimatedFee: aggregates._sum.estimatedFeeValue ?? 0,
      totalSqm: aggregates._sum.numberOfSqm ?? 0,
      closedDealsCount,
    };
  }

  async getMonthlySales(userId: number) {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const closedRequests = await this.prisma.propertyRequest.findMany({
      where: {
        userId,
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

  async getPipeline(userId: number) {
    const statusValues = Object.values(RequestStatus);

    const counts = await Promise.all(
      statusValues.map(async (status) => {
        const count = await this.prisma.propertyRequest.count({
          where: { userId, status },
        });
        return { status, count };
      }),
    );

    return counts;
  }

  async getExpiringLeases(userId: number) {
    const now = new Date();
    const in12Months = new Date();
    in12Months.setMonth(in12Months.getMonth() + 12);

    const tenants = await this.prisma.tenant.findMany({
      where: {
        endDate: {
          gte: now,
          lte: in12Months,
        },
      },
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
}
