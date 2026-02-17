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
    return this.personsService.findAll(page, limit, req.user.agencyId);
  }

  @Get('search')
  search(@Req() req: any, @Query('q') query: string) {
    return this.personsService.search(query || '', req.user.agencyId);
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
}
