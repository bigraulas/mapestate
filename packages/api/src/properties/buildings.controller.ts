import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
  Request,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Controller('properties/buildings')
@UseGuards(AuthGuard('jwt'))
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('locationId') locationId?: string,
    @Query('transactionType') transactionType?: string,
  ) {
    return this.buildingsService.findAll(
      page,
      limit,
      locationId ? parseInt(locationId, 10) : undefined,
      transactionType,
      req.user.agencyId,
    );
  }

  @Get('map')
  findForMap(@Req() req: any) {
    return this.buildingsService.findForMap(req.user.agencyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.buildingsService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateBuildingDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.buildingsService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBuildingDto,
    @Req() req: any,
  ) {
    return this.buildingsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.buildingsService.remove(id, req.user.id);
  }

  @Post('filter')
  filter(@Body() filterDto: Record<string, unknown>, @Req() req: any) {
    return this.buildingsService.filter(filterDto, req.user.agencyId);
  }

  @Patch(':id/reassign')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  reassign(
    @Param('id', ParseIntPipe) id: number,
    @Body('userId', ParseIntPipe) newUserId: number,
    @Req() req: any,
  ) {
    return this.buildingsService.reassign(id, newUserId, req.user.id);
  }
}
