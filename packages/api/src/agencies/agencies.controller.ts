import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AgencyStatus } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto } from './dto/create-agency.dto';

@Controller('agencies')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('PLATFORM_ADMIN')
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Post()
  create(@Body() dto: CreateAgencyDto) {
    return this.agenciesService.create(dto);
  }

  @Get()
  findAll() {
    return this.agenciesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.agenciesService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: AgencyStatus,
  ) {
    return this.agenciesService.updateStatus(id, status);
  }

  @Post(':id/invite')
  invite(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { email: string; firstName: string; lastName: string; role?: string },
  ) {
    return this.agenciesService.invite(id, dto);
  }
}
