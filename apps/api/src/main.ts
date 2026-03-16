import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = new Logger('Bootstrap');

  // 🛡️ Security headers
  app.use(helmet());

  // 🌍 CORS (dev front)
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Admin-Key'],
  });

  // 🔒 Validation globale stricte
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3001;

  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 API running on http://localhost:${port}`);
  logger.log(
    `🌍 Environment: ${configService.get('NODE_ENV') ?? 'development'}`,
  );
  logger.log(`🔍 Meilisearch: ${configService.get('MEILI_HOST')}`);
}

bootstrap();
