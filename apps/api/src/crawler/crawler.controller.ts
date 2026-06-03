import { Controller, Get, Post } from '@nestjs/common';

import { CrawlerService } from './crawler.service';

@Controller('crawler')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Get('jobs')
  async listJobs() {
    return this.crawlerService.listJobs();
  }

  @Post('run-one')
  async runOneJob() {
    return this.crawlerService.runOneJob();
  }

  @Post('run-batch')
  async runBatch() {
    return this.crawlerService.runBatch(5);
  }
}
