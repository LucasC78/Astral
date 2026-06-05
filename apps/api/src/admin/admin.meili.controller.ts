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
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin')
export class AdminMeiliController {
  constructor(
    private readonly tools: ToolsService,
    private readonly meili: MeiliService,
    private readonly prisma: PrismaService,
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

  private toPageDocument(page: any) {
    return {
      id: page.id,
      toolId: page.toolId,
      url: page.url,
      normalizedUrl: page.normalizedUrl,
      title: page.title,
      description: page.description,
      content: page.content,

      toolName: page.tool?.name ?? null,
      toolSlug: page.tool?.slug ?? null,
      toolCategory: page.tool?.category ?? null,
      toolCountryCode: page.tool?.countryCode ?? null,
      toolTags: Array.isArray(page.tool?.tags) ? page.tool.tags : [],

      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  @Post('reindex/pages')
  @UseGuards(AdminKeyGuard)
  async reindexPages() {
    await this.meili.health();
    await this.meili.configurePagesIndex();

    const pages = await this.prisma.pageContent.findMany({
      include: {
        tool: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const documents = pages.map((p) => this.toPageDocument(p));

    const task = await this.meili.indexPages(documents);

    return {
      index: 'pages',
      count: documents.length,
      task,
    };
  }

  @Post('reindex/pages/reset')
  @UseGuards(AdminKeyGuard)
  async resetAndReindexPages() {
    await this.meili.health();

    const reset = await this.meili.resetPagesIndex();

    await this.meili.configurePagesIndex(true);

    const pages = await this.prisma.pageContent.findMany({
      include: {
        tool: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const documents = pages.map((p) => this.toPageDocument(p));

    const task = await this.meili.indexPages(documents);

    return {
      reset,
      index: 'pages',
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
