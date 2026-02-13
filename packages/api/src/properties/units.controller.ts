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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Controller('properties/units')
@UseGuards(AuthGuard('jwt'))
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  findByBuilding(@Query('buildingId', ParseIntPipe) buildingId: number) {
    return this.unitsService.findByBuilding(buildingId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.unitsService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateUnitDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.unitsService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.unitsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.unitsService.remove(id);
  }
}
