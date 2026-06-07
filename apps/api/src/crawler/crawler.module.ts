import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { MeiliModule } from '../meili/meili.module';
import { CrawlerController } from './crawler.controller';
import { CrawlerService } from './crawler.service';
import { CrawlerScheduler } from './crawler.scheduler';

@Module({
  imports: [PrismaModule, MeiliModule],
  controllers: [CrawlerController],
  providers: [CrawlerService, CrawlerScheduler],
})
export class CrawlerModule {}
