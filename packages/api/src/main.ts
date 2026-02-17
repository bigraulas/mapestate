import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security headers
  app.use(helmet());

  // Serve uploaded files
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/api/uploads',
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS — restrict to FRONTEND_URL in production
  const frontendUrl = process.env.FRONTEND_URL;
  app.enableCors({
    origin: frontendUrl || true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.API_PORT || 3000;
  await app.listen(port);

  logger.log(`MapEstate API is running on http://localhost:${port}/api`);
}

bootstrap();
