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
  Res,
  ParseIntPipe,
  UseGuards,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { SendOffersDto } from './dto/send-offers.dto';

@Controller('offers')
@UseGuards(AuthGuard('jwt'))
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post('send')
  sendOffers(@Body() dto: SendOffersDto, @Req() req: any) {
    return this.offersService.sendOffers(dto, req.user.id);
  }

  @Get('deal/:dealId/pdf')
  async downloadPdf(
    @Param('dealId', ParseIntPipe) dealId: number,
    @Res() res: any,
  ) {
    const pdfBuffer = await this.offersService.generatePdf(dealId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="oferta-' + dealId + '.pdf"',
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.offersService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.offersService.findOne(id);
  }

  @Get('by-request/:requestId')
  findByRequest(@Param('requestId', ParseIntPipe) requestId: number) {
    return this.offersService.findByRequest(requestId);
  }

  @Post()
  create(@Body() dto: CreateOfferDto, @Req() req: any) {
    return this.offersService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Record<string, unknown>,
  ) {
    return this.offersService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.offersService.remove(id);
  }

  @Get(':id/download')
  download(@Param('id', ParseIntPipe) id: number) {
    return this.offersService.download(id);
  }

  @Post(':offerId/groups')
  createGroup(
    @Param('offerId', ParseIntPipe) offerId: number,
    @Body() dto: CreateGroupDto,
  ) {
    return this.offersService.createGroup(offerId, dto);
  }

  @Patch('groups/:groupId')
  updateGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.offersService.updateGroup(groupId, dto);
  }

  @Delete('groups/:groupId')
  removeGroup(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.offersService.removeGroup(groupId);
  }

  @Get('groups/:groupId')
  findGroup(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.offersService.findGroup(groupId);
  }
}
