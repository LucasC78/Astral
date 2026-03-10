import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Tool } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { MeiliService } from '../meili/meili.service';

import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';
import { ListToolsQuery } from './dto/list-tools.query';

@Injectable()
export class ToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meili: MeiliService,
  ) {}

  // GET /tools?q=&limit=&offset=
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
              // tags is String[] in Postgres (Prisma): match exact tag value
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
      }),
      this.prisma.tool.count({ where }),
    ]);

    return {
      items,
      limit,
      offset,
      total,
    };
  }

  // GET /tools/:slug
  async getBySlug(slug: string) {
    const normalizedSlug = String(slug ?? '')
      .trim()
      .toLowerCase();

    const tool = await this.prisma.tool.findUnique({
      where: { slug: normalizedSlug },
    });

    if (!tool) throw new NotFoundException('Tool introuvable');
    return tool;
  }

  // POST /tools
  async create(dto: CreateToolDto) {
    const slug = dto.slug.trim().toLowerCase();

    const tags = this.normalizeTags(dto.tags);
    const logoUrl = dto.logoUrl?.trim() || null;

    try {
      const created = await this.prisma.tool.create({
        data: {
          slug,
          name: dto.name.trim(),
          description: dto.description.trim(),
          websiteUrl: dto.websiteUrl.trim(),
          countryCode: dto.countryCode.trim().toUpperCase(),
          category: dto.category.trim(),
          hostingRegion: dto.hostingRegion.trim(),
          gdprLevel: dto.gdprLevel.trim(),
          isOpenSource: dto.isOpenSource ?? false,

          // ✅ nouveaux champs
          logoUrl,
          tags,
        },
      });

      await this.safeMeiliUpsert(created);

      return created;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('slug déjà utilisé');
      }
      throw e;
    }
  }

  // PATCH /tools/:slug (admin)
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

    // ✅ nouveaux champs
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl?.trim() || null;
    if (dto.tags !== undefined) data.tags = this.normalizeTags(dto.tags);

    try {
      const updated = await this.prisma.tool.update({
        where: { slug: normalizedSlug },
        data,
      });

      await this.safeMeiliUpsert(updated);

      return updated;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('slug déjà utilisé');
      }
      throw e;
    }
  }

  // DELETE /tools/:slug (admin)
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

    // best-effort Meili delete
    try {
      await this.meili.deleteTool(deleted.id);
    } catch {
      // no-op (tu veux éviter de casser l'API si Meili est down)
    }

    return deleted;
  }

  // utilisé par /admin/reindex
  async findAllForReindex() {
    return this.prisma.tool.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // -------------------------
  // Helpers
  // -------------------------

  private normalizeTags(tags?: string[]) {
    if (!Array.isArray(tags)) return [];
    return tags
      .map((t) => String(t).trim().toLowerCase())
      .filter((t) => t.length > 0)
      .slice(0, 20);
  }

  private toMeiliDoc(t: Tool) {
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

      // ✅ champs enrichis
      logoUrl: t.logoUrl ?? null,
      tags: Array.isArray(t.tags) ? t.tags : [],

      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  private async safeMeiliUpsert(tool: Tool) {
    try {
      await this.meili.configureToolsIndex();
      await this.meili.indexTools([this.toMeiliDoc(tool)]);
    } catch {
      // no-op: tu veux préserver create/update même si Meili est down
    }
  }
}
