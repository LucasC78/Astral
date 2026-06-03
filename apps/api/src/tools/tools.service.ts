import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Tool } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { MeiliService } from '../meili/meili.service';

import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';
import { ListToolsQuery } from './dto/list-tools.query';

const toolInclude = {
  primaryUrl: true,
  primaryImage: true,
  urls: true,
  images: true,
} satisfies Prisma.ToolInclude;

type ToolWithAssets = Prisma.ToolGetPayload<{
  include: typeof toolInclude;
}>;

@Injectable()
export class ToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meili: MeiliService,
  ) {}

  async list(query: ListToolsQuery) {
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = query.offset ?? 0;
    const q = (query.q ?? '').trim();

    const where =
      q.length > 0
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { description: { contains: q, mode: 'insensitive' as const } },
              { category: { contains: q, mode: 'insensitive' as const } },
              { countryCode: { contains: q, mode: 'insensitive' as const } },
              { tags: { has: q.toLowerCase() } as any },
            ],
          }
        : {};

    const [items, total] = await Promise.all([
      this.prisma.tool.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: toolInclude,
      }),
      this.prisma.tool.count({ where }),
    ]);

    return {
      items: items.map((tool) => this.toApiTool(tool)),
      limit,
      offset,
      total,
    };
  }

  async getBySlug(slug: string) {
    const normalizedSlug = String(slug ?? '')
      .trim()
      .toLowerCase();

    const tool = await this.prisma.tool.findUnique({
      where: { slug: normalizedSlug },
      include: toolInclude,
    });

    if (!tool) throw new NotFoundException('Tool introuvable');

    return this.toApiTool(tool);
  }

  async create(dto: CreateToolDto) {
    const slug = dto.slug.trim().toLowerCase();

    const tags = this.normalizeTags(dto.tags);
    const logoUrl = dto.logoUrl?.trim() || null;
    const websiteUrl = dto.websiteUrl.trim();

    try {
      const created = await this.prisma.tool.create({
        data: {
          slug,
          name: dto.name.trim(),
          description: dto.description.trim(),
          websiteUrl,
          countryCode: dto.countryCode.trim().toUpperCase(),
          category: dto.category.trim(),
          hostingRegion: dto.hostingRegion.trim(),
          gdprLevel: dto.gdprLevel.trim(),
          isOpenSource: dto.isOpenSource ?? false,
          logoUrl,
          tags,
        },
      });

      const toolUrl = await this.prisma.toolUrl.create({
        data: {
          toolId: created.id,
          url: websiteUrl,
          normalizedUrl: this.normalizeUrl(websiteUrl),
          type: 'OFFICIAL_WEBSITE',
          isPrimary: true,
          isActive: true,
          lastSeenAt: new Date(),
        },
      });

      let toolImage: { id: number } | null = null;

      if (logoUrl) {
        toolImage = await this.prisma.toolImage.create({
          data: {
            toolId: created.id,
            url: logoUrl,
            normalizedUrl: this.normalizeUrl(logoUrl),
            type: 'LOGO',
            isPrimary: true,
            lastSeenAt: new Date(),
          },
        });
      }

      const enriched = await this.prisma.tool.update({
        where: { id: created.id },
        data: {
          primaryUrlId: toolUrl.id,
          primaryImageId: toolImage?.id ?? null,
        },
        include: toolInclude,
      });

      await this.safeMeiliUpsert(enriched);

      return this.toApiTool(enriched);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('slug déjà utilisé');
      }
      throw e;
    }
  }

  async updateBySlug(slug: string, dto: UpdateToolDto) {
    const normalizedSlug = String(slug ?? '')
      .trim()
      .toLowerCase();

    const existing = await this.prisma.tool.findUnique({
      where: { slug: normalizedSlug },
    });

    if (!existing) throw new NotFoundException('Tool introuvable');

    const data: Record<string, any> = {};

    if (dto.slug !== undefined) data.slug = dto.slug.trim().toLowerCase();
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined)
      data.description = dto.description.trim();
    if (dto.websiteUrl !== undefined) data.websiteUrl = dto.websiteUrl.trim();
    if (dto.countryCode !== undefined)
      data.countryCode = dto.countryCode.trim().toUpperCase();
    if (dto.category !== undefined) data.category = dto.category.trim();
    if (dto.hostingRegion !== undefined)
      data.hostingRegion = dto.hostingRegion.trim();
    if (dto.gdprLevel !== undefined) data.gdprLevel = dto.gdprLevel.trim();
    if (dto.isOpenSource !== undefined) data.isOpenSource = dto.isOpenSource;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl?.trim() || null;
    if (dto.tags !== undefined) data.tags = this.normalizeTags(dto.tags);

    try {
      const updated = await this.prisma.tool.update({
        where: { slug: normalizedSlug },
        data,
      });

      if (dto.websiteUrl !== undefined) {
        const websiteUrl = dto.websiteUrl.trim();

        const toolUrl = await this.prisma.toolUrl.upsert({
          where: {
            toolId_normalizedUrl: {
              toolId: updated.id,
              normalizedUrl: this.normalizeUrl(websiteUrl),
            },
          },
          update: {
            url: websiteUrl,
            type: 'OFFICIAL_WEBSITE',
            isPrimary: true,
            isActive: true,
            lastSeenAt: new Date(),
          },
          create: {
            toolId: updated.id,
            url: websiteUrl,
            normalizedUrl: this.normalizeUrl(websiteUrl),
            type: 'OFFICIAL_WEBSITE',
            isPrimary: true,
            isActive: true,
            lastSeenAt: new Date(),
          },
        });

        await this.prisma.tool.update({
          where: { id: updated.id },
          data: { primaryUrlId: toolUrl.id },
        });
      }

      if (dto.logoUrl !== undefined) {
        const logoUrl = dto.logoUrl?.trim() || null;

        if (logoUrl) {
          const toolImage = await this.prisma.toolImage.upsert({
            where: {
              toolId_normalizedUrl: {
                toolId: updated.id,
                normalizedUrl: this.normalizeUrl(logoUrl),
              },
            },
            update: {
              url: logoUrl,
              type: 'LOGO',
              isPrimary: true,
              lastSeenAt: new Date(),
            },
            create: {
              toolId: updated.id,
              url: logoUrl,
              normalizedUrl: this.normalizeUrl(logoUrl),
              type: 'LOGO',
              isPrimary: true,
              lastSeenAt: new Date(),
            },
          });

          await this.prisma.tool.update({
            where: { id: updated.id },
            data: { primaryImageId: toolImage.id },
          });
        } else {
          await this.prisma.tool.update({
            where: { id: updated.id },
            data: { primaryImageId: null },
          });
        }
      }

      const enriched = await this.prisma.tool.findUniqueOrThrow({
        where: { id: updated.id },
        include: toolInclude,
      });

      await this.safeMeiliUpsert(enriched);

      return this.toApiTool(enriched);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('slug déjà utilisé');
      }
      throw e;
    }
  }

  async deleteBySlug(slug: string) {
    const normalizedSlug = String(slug ?? '')
      .trim()
      .toLowerCase();

    const existing = await this.prisma.tool.findUnique({
      where: { slug: normalizedSlug },
    });

    if (!existing) throw new NotFoundException('Tool introuvable');

    const deleted = await this.prisma.tool.delete({
      where: { slug: normalizedSlug },
    });

    try {
      await this.meili.deleteTool(deleted.id);
    } catch {}

    return deleted;
  }

  async findAllForReindex() {
    return this.prisma.tool.findMany({
      orderBy: { createdAt: 'desc' },
      include: toolInclude,
    });
  }

  private normalizeTags(tags?: string[]) {
    if (!Array.isArray(tags)) return [];
    return tags
      .map((t) => String(t).trim().toLowerCase())
      .filter((t) => t.length > 0)
      .slice(0, 20);
  }

  private normalizeUrl(url: string) {
    return url.trim().toLowerCase();
  }

  private toApiTool(t: ToolWithAssets) {
    return {
      ...t,
      websiteUrl: t.primaryUrl?.url ?? t.websiteUrl,
      logoUrl: t.primaryImage?.url ?? t.logoUrl ?? null,
      urls: t.urls ?? [],
      images: t.images ?? [],
    };
  }

  private toMeiliDoc(t: Tool | ToolWithAssets) {
    const primaryUrl = 'primaryUrl' in t ? t.primaryUrl : null;
    const primaryImage = 'primaryImage' in t ? t.primaryImage : null;

    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      websiteUrl: primaryUrl?.url ?? t.websiteUrl,
      countryCode: t.countryCode,
      category: t.category,
      hostingRegion: t.hostingRegion,
      gdprLevel: t.gdprLevel,
      isOpenSource: t.isOpenSource,
      logoUrl: primaryImage?.url ?? t.logoUrl ?? null,
      tags: Array.isArray(t.tags) ? t.tags : [],
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  private async safeMeiliUpsert(tool: Tool | ToolWithAssets) {
    try {
      await this.meili.configureToolsIndex();
      await this.meili.indexTools([this.toMeiliDoc(tool)]);
    } catch {}
  }
}
