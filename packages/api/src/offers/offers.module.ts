import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { PdfGeneratorService } from './pdf-generator.service';

@Module({
  controllers: [OffersController],
  providers: [OffersService, PdfGeneratorService],
  exports: [OffersService],
})
export class OffersModule {}
