import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { PdfGeneratorService } from './pdf-generator.service';

@Module({
  imports: [ActivitiesModule],
  controllers: [OffersController],
  providers: [OffersService, PdfGeneratorService],
  exports: [OffersService],
})
export class OffersModule {}
