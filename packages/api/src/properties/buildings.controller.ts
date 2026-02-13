import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Controller('properties/buildings')
@UseGuards(AuthGuard('jwt'))
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  findAll(
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
    );
  }

  @Get('map')
  findForMap() {
    return this.buildingsService.findForMap();
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
  ) {
    return this.buildingsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.buildingsService.remove(id);
  }

  @Post('filter')
  filter(@Body() filterDto: Record<string, unknown>) {
    return this.buildingsService.filter(filterDto);
  }
}
