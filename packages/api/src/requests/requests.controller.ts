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
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateColdSalesDto } from './dto/create-cold-sales.dto';

@Controller('requests')
@UseGuards(AuthGuard('jwt'))
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.requestsService.findAll(page, limit);
  }

  @Get('my')
  findMy(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.requestsService.findMyRequests(req.user.id, page, limit);
  }

  @Get('my/board')
  findMyBoard(@Req() req: any) {
    return this.requestsService.findMyBoard(req.user.id);
  }

  @Get('stats/active')
  getActiveStats(@Req() req: any) {
    return this.requestsService.getActiveStats(req.user.id);
  }

  @Get('stats/closed')
  getClosedStats(@Req() req: any) {
    return this.requestsService.getClosedStats(req.user.id);
  }

  @Get(':id/matches')
  findMatches(@Param('id', ParseIntPipe) id: number) {
    return this.requestsService.findMatches(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.requestsService.findOne(id);
  }

  @Post('cold-sales')
  createColdSales(@Body() dto: CreateColdSalesDto, @Req() req: any) {
    return this.requestsService.createColdSales(dto, req.user.id);
  }

  @Post()
  create(@Body() dto: CreateRequestDto, @Req() req: any) {
    return this.requestsService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRequestDto,
  ) {
    return this.requestsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.requestsService.remove(id);
  }

  @Post('filter')
  filter(
    @Body() filters: Record<string, unknown>,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.requestsService.filter(filters, page, limit);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.requestsService.updateStatus(id, dto);
  }
}
