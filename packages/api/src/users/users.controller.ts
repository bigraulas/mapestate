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
import { Role } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll(page, limit, req.user.agencyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.usersService.create(dto, req.user.agencyId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.delete(id);
  }

  @Get(':id/portfolio-count')
  portfolioCount(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.usersService.portfolioCount(id, req.user.agencyId);
  }

  @Post('bulk-reassign-portfolio')
  async bulkReassignPortfolio(
    @Req() req: any,
    @Body('fromUserId', ParseIntPipe) fromUserId: number,
    @Body('toUserId', ParseIntPipe) toUserId: number,
  ) {
    const result = await this.usersService.bulkReassignPortfolio(
      fromUserId,
      toUserId,
      req.user.agencyId,
    );

    await this.auditService.log(
      'BULK_REASSIGN',
      'PORTFOLIO',
      fromUserId,
      req.user.id,
      { fromUserId, toUserId, ...result },
    );

    return result;
  }
}
