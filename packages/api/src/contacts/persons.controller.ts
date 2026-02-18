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
import { PersonsService } from './persons.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';

@Controller('contacts/persons')
@UseGuards(AuthGuard('jwt'))
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const effectiveUserId = this.resolveUserId(req.user);
    return this.personsService.findAll(page, limit, effectiveUserId, req.user.agencyId);
  }

  @Get('search')
  search(@Req() req: any, @Query('q') query: string) {
    const effectiveUserId = this.resolveUserId(req.user);
    return this.personsService.search(query || '', effectiveUserId, req.user.agencyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.personsService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreatePersonDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.personsService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePersonDto,
  ) {
    return this.personsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.personsService.delete(id);
  }

  @Post(':id/assign-company')
  assignCompany(
    @Param('id', ParseIntPipe) id: number,
    @Body('companyId', ParseIntPipe) companyId: number,
  ) {
    return this.personsService.assignCompany(id, companyId);
  }

  @Patch(':id/reassign')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  reassign(
    @Param('id', ParseIntPipe) id: number,
    @Body('userId', ParseIntPipe) newUserId: number,
  ) {
    return this.personsService.reassign(id, newUserId);
  }

  @Post('bulk-reassign')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  bulkReassign(
    @Req() req: any,
    @Body('fromUserId', ParseIntPipe) fromUserId: number,
    @Body('toUserId', ParseIntPipe) toUserId: number,
  ) {
    return this.personsService.bulkReassign(fromUserId, toUserId, req.user.agencyId);
  }

  private resolveUserId(user: { id: number; role: string }): number | null {
    if (user.role === 'ADMIN' || user.role === 'PLATFORM_ADMIN') {
      return null;
    }
    return user.id;
  }
}
