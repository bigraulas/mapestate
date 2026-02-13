import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  getKpis(@Req() req: any) {
    return this.dashboardService.getKpis(req.user.id);
  }

  @Get('monthly-sales')
  getMonthlySales(@Req() req: any) {
    return this.dashboardService.getMonthlySales(req.user.id);
  }

  @Get('pipeline')
  getPipeline(@Req() req: any) {
    return this.dashboardService.getPipeline(req.user.id);
  }

  @Get('expiring-leases')
  getExpiringLeases(@Req() req: any) {
    return this.dashboardService.getExpiringLeases(req.user.id);
  }
}
