import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ToolsService } from '../tools/tools.service';
import { MeiliService } from '../meili/meili.service';
import { AdminKeyGuard } from './admin-key.guard';

@Controller('admin')
export class AdminMeiliController {
  constructor(
    private readonly tools: ToolsService,
    private readonly meili: MeiliService,
  ) {}

  private toToolDocument(t: any) {
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      websiteUrl: t.websiteUrl,
      countryCode: t.countryCode,
      category: t.category,
      hostingRegion: t.hostingRegion,
      gdprLevel: t.gdprLevel,
      isOpenSource: t.isOpenSource,

      // ✅ nouveaux champs
      logoUrl: t.logoUrl ?? null,
      tags: Array.isArray(t.tags) ? t.tags : [],

      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  @Post('reindex')
  @UseGuards(AdminKeyGuard)
  async reindexTools() {
    await this.meili.health();
    await this.meili.configureToolsIndex();

    const tools = await this.tools.findAllForReindex();
    const documents = tools.map((t) => this.toToolDocument(t));

    const task = await this.meili.indexTools(documents);

    return {
      index: this.meili.getToolsIndexName(),
      count: documents.length,
      task,
    };
  }

  // ✅ Reset complet + reindex (1 seul endpoint = nettoyage total)
  @Post('reindex/reset')
  @UseGuards(AdminKeyGuard)
  async resetAndReindexTools() {
    await this.meili.health();

    const reset = await this.meili.resetToolsIndex();

    // après deleteIndex, l'index sera recréé à l'indexation + on remet les settings
    await this.meili.configureToolsIndex(true);

    const tools = await this.tools.findAllForReindex();
    const documents = tools.map((t) => this.toToolDocument(t));

    const task = await this.meili.indexTools(documents);

    return {
      reset,
      index: this.meili.getToolsIndexName(),
      count: documents.length,
      task,
    };
  }

  @Get('tasks/:taskUid')
  @UseGuards(AdminKeyGuard)
  async getTask(@Param('taskUid') taskUidParam: string) {
    const taskUid = Number(taskUidParam);

    if (!Number.isInteger(taskUid) || taskUid < 0) {
      throw new BadRequestException('taskUid invalide');
    }

    return this.meili.getTask(taskUid);
  }
}
