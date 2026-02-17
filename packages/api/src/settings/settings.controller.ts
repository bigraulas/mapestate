import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(AuthGuard('jwt'))
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('agency')
  getAgencySettings(@Req() req: any) {
    if (!req.user.agencyId) {
      throw new ForbiddenException('No agency assigned');
    }
    return this.settingsService.getAgencySettings(req.user.agencyId);
  }

  @Patch('agency')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateAgencySettings(
    @Req() req: any,
    @Body()
    data: {
      name?: string;
      logo?: string | null;
      coverImage?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
      primaryColor?: string;
    },
  ) {
    if (!req.user.agencyId) {
      throw new ForbiddenException('No agency assigned');
    }
    return this.settingsService.updateAgencySettings(req.user.agencyId, data);
  }
}
