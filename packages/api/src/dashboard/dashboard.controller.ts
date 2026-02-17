import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  getKpis(@Req() req: any, @Query('brokerId') brokerId?: string) {
    const effectiveUserId = this.resolveUserId(req.user, brokerId);
    return this.dashboardService.getKpis(effectiveUserId, req.user.agencyId);
  }

  @Get('monthly-sales')
  getMonthlySales(@Req() req: any, @Query('brokerId') brokerId?: string) {
    const effectiveUserId = this.resolveUserId(req.user, brokerId);
    return this.dashboardService.getMonthlySales(effectiveUserId, req.user.agencyId);
  }

  @Get('pipeline')
  getPipeline(@Req() req: any, @Query('brokerId') brokerId?: string) {
    const effectiveUserId = this.resolveUserId(req.user, brokerId);
    return this.dashboardService.getPipeline(effectiveUserId, req.user.agencyId);
  }

  @Get('expiring-leases')
  getExpiringLeases(@Req() req: any, @Query('brokerId') brokerId?: string) {
    const effectiveUserId = this.resolveUserId(req.user, brokerId);
    return this.dashboardService.getExpiringLeases(effectiveUserId, req.user.agencyId);
  }

  @Get('broker-performance')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getBrokerPerformance(@Req() req: any) {
    return this.dashboardService.getBrokerPerformance(req.user.agencyId);
  }

  /**
   * ADMIN with no brokerId → null (all data).
   * ADMIN with brokerId → that broker's id.
   * BROKER → always own id.
   */
  private resolveUserId(
    user: { id: number; role: string },
    brokerId?: string,
  ): number | null {
    if (user.role === Role.ADMIN || user.role === 'PLATFORM_ADMIN') {
      return brokerId ? parseInt(brokerId, 10) : null;
    }
    return user.id;
  }
}
