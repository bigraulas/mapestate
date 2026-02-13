import { Module } from '@nestjs/common';
import { BuildingsController } from './buildings.controller';
import { UnitsController } from './units.controller';
import { LocationsController } from './locations.controller';
import { DiscoverController } from './discover.controller';
import { UploadsController } from './uploads.controller';
import { BuildingsService } from './buildings.service';
import { UnitsService } from './units.service';
import { LocationsService } from './locations.service';
import { DiscoverService } from './discover.service';

@Module({
  controllers: [BuildingsController, UnitsController, LocationsController, DiscoverController, UploadsController],
  providers: [BuildingsService, UnitsService, LocationsService, DiscoverService],
  exports: [BuildingsService, UnitsService, LocationsService, DiscoverService],
})
export class PropertiesModule {}
