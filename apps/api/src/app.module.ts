import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';

import { PrismaModule } from './prisma/prisma.module';
import { ToolsModule } from './tools/tools.module';
import { MeiliModule } from './meili/meili.module';
import { AdminModule } from './admin/admin.module';
import { envValidationSchema } from './config/env.validation';
import { CrawlerModule } from './crawler/crawler.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema, // 👈
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const ttl = Number(config.get('THROTTLE_TTL_MS') ?? 60000);
        const limit = Number(config.get('THROTTLE_LIMIT') ?? 300);

        return [
          {
            ttl,
            limit,
          },
        ];
      },
    }),

    PrismaModule,
    MeiliModule,
    ToolsModule,
    AdminModule,
    CrawlerModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
