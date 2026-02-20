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
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Controller('contacts/companies')
@UseGuards(AuthGuard('jwt'))
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const effectiveUserId = this.resolveUserId(req.user);
    return this.companiesService.findAll(page, limit, effectiveUserId, req.user.agencyId);
  }

  @Get('lookup-cui/:cui')
  lookupCui(@Param('cui') cui: string) {
    return this.companiesService.lookupCui(cui);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.companiesService.findOne(id, req.user.agencyId);
  }

  @Post()
  create(
    @Body() dto: CreateCompanyDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.companiesService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyDto,
    @Req() req: any,
  ) {
    return this.companiesService.update(id, dto, req.user.agencyId);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.companiesService.delete(id, req.user.agencyId);
  }

  @Post('filter')
  filter(
    @Req() req: any,
    @Body('name') name: string,
    @Body('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Body('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const effectiveUserId = this.resolveUserId(req.user);
    return this.companiesService.filter(name, page, limit, effectiveUserId, req.user.agencyId);
  }

  @Post(':id/logo')
  uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @Body('logo') logo: string,
    @Req() req: any,
  ) {
    return this.companiesService.updateLogo(id, logo, req.user.agencyId);
  }

  @Patch(':id/reassign')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  reassign(
    @Param('id', ParseIntPipe) id: number,
    @Body('userId', ParseIntPipe) newUserId: number,
    @Req() req: any,
  ) {
    return this.companiesService.reassign(id, newUserId, req.user.agencyId);
  }

  @Post('bulk-reassign')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  bulkReassign(
    @Req() req: any,
    @Body('fromUserId', ParseIntPipe) fromUserId: number,
    @Body('toUserId', ParseIntPipe) toUserId: number,
  ) {
    return this.companiesService.bulkReassign(fromUserId, toUserId, req.user.agencyId);
  }

  private resolveUserId(user: { id: number; role: string }): number | null {
    if (user.role === 'ADMIN' || user.role === 'PLATFORM_ADMIN') {
      return null;
    }
    return user.id;
  }
}
