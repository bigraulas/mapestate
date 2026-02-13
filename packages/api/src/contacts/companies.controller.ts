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
  DefaultValuePipe,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Controller('contacts/companies')
@UseGuards(AuthGuard('jwt'))
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.companiesService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.companiesService.findOne(id);
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
  ) {
    return this.companiesService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.companiesService.delete(id);
  }

  @Post('filter')
  filter(
    @Body('name') name: string,
    @Body('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Body('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.companiesService.filter(name, page, limit);
  }

  @Post(':id/logo')
  uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @Body('logo') logo: string,
  ) {
    return this.companiesService.updateLogo(id, logo);
  }
}
