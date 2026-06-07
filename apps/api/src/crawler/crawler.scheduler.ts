import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { CrawlerService } from './crawler.service';

@Injectable()
export class CrawlerScheduler {
  private readonly logger = new Logger(CrawlerScheduler.name);

  constructor(private readonly crawler: CrawlerService) {}

  @Cron('*/1 * * * *')
  async handleCron() {
    const enabled = process.env.CRAWLER_CRON_ENABLED === 'true';

    if (!enabled) return;

    const limit = Number(process.env.CRAWLER_CRON_BATCH_LIMIT ?? 3);

    const result = await this.crawler.runBatch(limit);

    this.logger.log(
      `Crawler cron processed ${result.processed}/${result.limit} jobs`,
    );
  }
}
