import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma';

// These modules will be added as they are implemented:
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PropertiesModule } from './properties/properties.module';
import { ContactsModule } from './contacts/contacts.module';
import { RequestsModule } from './requests/requests.module';
import { OffersModule } from './offers/offers.module';
import { ActivitiesModule } from './activities/activities.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    ContactsModule,
    RequestsModule,
    OffersModule,
    ActivitiesModule,
    DashboardModule,
  ],
})
export class AppModule {}
