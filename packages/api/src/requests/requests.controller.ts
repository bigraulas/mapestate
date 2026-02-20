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
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
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
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const effectiveUserId = this.resolveUserId(req.user);
    return this.requestsService.findMyRequests(effectiveUserId, page, limit, req.user.agencyId);
  }

  @Get('my')
  findMy(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('brokerId') brokerId?: string,
  ) {
    const effectiveUserId = this.resolveUserId(req.user, brokerId);
    return this.requestsService.findMyRequests(effectiveUserId, page, limit, req.user.agencyId);
  }

  @Get('my/board')
  findMyBoard(@Req() req: any, @Query('brokerId') brokerId?: string) {
    const effectiveUserId = this.resolveUserId(req.user, brokerId);
    return this.requestsService.findMyBoard(effectiveUserId, req.user.agencyId);
  }

  @Get('stats/active')
  getActiveStats(@Req() req: any, @Query('brokerId') brokerId?: string) {
    const effectiveUserId = this.resolveUserId(req.user, brokerId);
    return this.requestsService.getActiveStats(effectiveUserId, req.user.agencyId);
  }

  @Get('stats/closed')
  getClosedStats(@Req() req: any, @Query('brokerId') brokerId?: string) {
    const effectiveUserId = this.resolveUserId(req.user, brokerId);
    return this.requestsService.getClosedStats(effectiveUserId, req.user.agencyId);
  }

  @Get(':id/matches')
  findMatches(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.requestsService.findMatches(id, req.user.agencyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.requestsService.findOne(id, req.user.agencyId);
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
    @Req() req: any,
  ) {
    return this.requestsService.update(id, dto, req.user.id, req.user.agencyId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.requestsService.remove(id, req.user.id, req.user.agencyId);
  }

  @Post('filter')
  filter(
    @Body() filters: Record<string, unknown>,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Req() req: any,
  ) {
    const effectiveUserId = this.resolveUserId(req.user);
    return this.requestsService.filter(filters, page, limit, effectiveUserId, req.user.agencyId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
    @Req() req: any,
  ) {
    return this.requestsService.updateStatus(id, dto, req.user.id, req.user.agencyId);
  }

  @Post(':id/close')
  close(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.requestsService.closeDeal(id, body, req.user.id, req.user.agencyId);
  }

  @Patch(':id/reassign')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  reassign(
    @Param('id', ParseIntPipe) id: number,
    @Body('userId', ParseIntPipe) newUserId: number,
    @Req() req: any,
  ) {
    return this.requestsService.reassign(id, newUserId, req.user.id, req.user.agencyId);
  }

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
