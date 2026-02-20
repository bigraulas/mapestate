import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate required env vars early
  const required = ['JWT_SECRET', 'DATABASE_URL', 'MAPBOX_TOKEN'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    logger.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

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
  const isProduction = process.env.NODE_ENV === 'production';
  if (!frontendUrl && isProduction) {
    logger.error('FRONTEND_URL is required in production');
    process.exit(1);
  }
  if (!frontendUrl) {
    logger.warn('FRONTEND_URL not set — CORS allows all origins (dev only)');
  }
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
