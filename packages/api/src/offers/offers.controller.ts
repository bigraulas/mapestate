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
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  // ── Public endpoint (no auth) ──────────────────────────────
  @Get('pdf/shared/:token')
  async getSharedPdf(
    @Param('token') token: string,
    @Res() res: any,
  ) {
    const filePath = this.offersService.getSharedPdfPath(token);
    if (!filePath) {
      res.status(404).json({ message: 'PDF not found or expired' });
      return;
    }
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="oferta.pdf"',
    });
    const fs = await import('fs');
    fs.createReadStream(filePath).pipe(res);
  }

  // ── Authenticated endpoints ────────────────────────────────
  @Post('send')
  @UseGuards(AuthGuard('jwt'))
  sendOffers(@Body() dto: SendOffersDto, @Req() req: any) {
    return this.offersService.sendOffers(dto, req.user.id);
  }

  @Post('deal/:dealId/pdf-link')
  @UseGuards(AuthGuard('jwt'))
  async createPdfLink(
    @Param('dealId', ParseIntPipe) dealId: number,
    @Body() body: { buildingIds?: number[]; buildingOverrides?: any[] },
  ) {
    const token = await this.offersService.createSharedPdf(dealId, body.buildingIds, body.buildingOverrides);
    return { token };
  }

  @Post('deal/:dealId/pdf')
  @UseGuards(AuthGuard('jwt'))
  async generatePdfWithOverrides(
    @Param('dealId', ParseIntPipe) dealId: number,
    @Body() body: { buildingIds?: number[]; buildingOverrides?: any[] },
    @Res() res: any,
  ) {
    const pdfBuffer = await this.offersService.generatePdf(dealId, body.buildingIds, body.buildingOverrides);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="oferta-' + dealId + '.pdf"',
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get('deal/:dealId/pdf')
  @UseGuards(AuthGuard('jwt'))
  async downloadPdf(
    @Param('dealId', ParseIntPipe) dealId: number,
    @Query('buildingIds') buildingIdsParam: string,
    @Res() res: any,
  ) {
    const buildingIds = buildingIdsParam
      ? buildingIdsParam.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n))
      : undefined;

    const pdfBuffer = await this.offersService.generatePdf(dealId, buildingIds);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="oferta-' + dealId + '.pdf"',
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Patch(':id/feedback')
  @UseGuards(AuthGuard('jwt'))
  updateFeedback(
    @Param('id', ParseIntPipe) id: number,
    @Body('feedback') feedback: string,
    @Req() req: any,
    @Body('feedbackNotes') feedbackNotes?: string,
  ) {
    return this.offersService.updateFeedback(id, feedback, feedbackNotes, req.user.agencyId);
  }

  @Get('by-request/:requestId')
  @UseGuards(AuthGuard('jwt'))
  findByRequest(@Param('requestId', ParseIntPipe) requestId: number) {
    return this.offersService.findByRequest(requestId);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const effectiveUserId = this.resolveUserId(req.user);
    return this.offersService.findAll(page, limit, effectiveUserId, req.user.agencyId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.offersService.findOne(id, req.user.agencyId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() dto: CreateOfferDto, @Req() req: any) {
    return this.offersService.create(dto, req.user.id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Record<string, unknown>,
    @Req() req: any,
  ) {
    return this.offersService.update(id, data, req.user.agencyId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.offersService.remove(id, req.user.agencyId);
  }

  @Get(':id/download')
  @UseGuards(AuthGuard('jwt'))
  download(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.offersService.download(id, req.user.agencyId);
  }

  @Post(':offerId/groups')
  @UseGuards(AuthGuard('jwt'))
  createGroup(
    @Param('offerId', ParseIntPipe) offerId: number,
    @Body() dto: CreateGroupDto,
  ) {
    return this.offersService.createGroup(offerId, dto);
  }

  @Patch('groups/:groupId')
  @UseGuards(AuthGuard('jwt'))
  updateGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.offersService.updateGroup(groupId, dto);
  }

  @Get('groups/:groupId')
  @UseGuards(AuthGuard('jwt'))
  findGroup(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.offersService.findGroup(groupId);
  }

  @Delete('groups/:groupId')
  @UseGuards(AuthGuard('jwt'))
  removeGroup(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.offersService.removeGroup(groupId);
  }

  private resolveUserId(user: { id: number; role: string }): number | null {
    if (user.role === 'ADMIN' || user.role === 'PLATFORM_ADMIN') {
      return null;
    }
    return user.id;
  }
}
