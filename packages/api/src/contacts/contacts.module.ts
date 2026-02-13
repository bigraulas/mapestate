import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { PersonsController } from './persons.controller';
import { LabelsController } from './labels.controller';
import { CompaniesService } from './companies.service';
import { PersonsService } from './persons.service';
import { LabelsService } from './labels.service';

@Module({
  controllers: [CompaniesController, PersonsController, LabelsController],
  providers: [CompaniesService, PersonsService, LabelsService],
  exports: [CompaniesService, PersonsService, LabelsService],
})
export class ContactsModule {}
