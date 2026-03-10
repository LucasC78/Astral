import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MeiliService } from './meili.service';
import { SearchQuery } from './dto/search.query';

function escapeMeili(v: string) {
  return String(v).replaceAll('"', '\\"');
}

function buildOrFilter(field: string, values?: string[]) {
  const clean = (values ?? []).filter(Boolean);
  if (clean.length === 0) return null;
  if (clean.length === 1) return `${field} = "${escapeMeili(clean[0])}"`;
  return `(${clean.map((v) => `${field} = "${escapeMeili(v)}"`).join(' OR ')})`;
}

@Controller()
export class MeiliSearchController {
  constructor(
    private readonly meili: MeiliService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('search')
  async search(@Query() query: SearchQuery) {
    const filters: string[] = [];

    const cc = buildOrFilter('countryCode', query.countryCode);
    if (cc) filters.push(cc);

    const cat = buildOrFilter('category', query.category);
    if (cat) filters.push(cat);

    const hr = buildOrFilter('hostingRegion', query.hostingRegion);
    if (hr) filters.push(hr);

    const gdpr = buildOrFilter('gdprLevel', query.gdprLevel);
    if (gdpr) filters.push(gdpr);

    if (query.isOpenSource !== undefined) {
      filters.push(`isOpenSource = ${query.isOpenSource}`);
    }

    const facets = [
      'countryCode',
      'category',
      'hostingRegion',
      'gdprLevel',
      'isOpenSource',
    ];

    // ✅ 1) Try Meili
    try {
      await this.meili.health();

      const res = await this.meili.searchTools(query.q, {
        limit: query.limit,
        offset: query.offset,
        // ✅ Meili attend un tableau de filtres (AND entre éléments)
        filter: filters.length ? filters : undefined,
        sort: query.sort,
        facets,
      });

      return { ...res, source: 'meili' as const };
    } catch {
      // ✅ 2) Fallback DB (mode dégradé) + filtres appliqués
      const limit = Math.min(query.limit ?? 20, 100);
      const offset = query.offset ?? 0;

      // filtres structurés
      const filterWhere: any = {};
      if (query.countryCode?.length)
        filterWhere.countryCode = { in: query.countryCode };
      if (query.category?.length) filterWhere.category = { in: query.category };
      if (query.hostingRegion?.length)
        filterWhere.hostingRegion = { in: query.hostingRegion };
      if (query.gdprLevel?.length)
        filterWhere.gdprLevel = { in: query.gdprLevel };
      if (query.isOpenSource !== undefined)
        filterWhere.isOpenSource = query.isOpenSource;

      // full-text fallback
      const qWhere =
        query.q && query.q.trim().length > 0
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' as const } },
                {
                  description: {
                    contains: query.q,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  category: { contains: query.q, mode: 'insensitive' as const },
                },
                {
                  countryCode: {
                    contains: query.q,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {};

      // AND = filtres + recherche
      const where = { ...filterWhere, ...(qWhere as any) };

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
        hits: items,
        query: query.q,
        limit,
        offset,
        estimatedTotalHits: total,
        processingTimeMs: 0,
        facetDistribution: {}, // pas dispo en DB fallback
        facetStats: {},
        source: 'db' as const,
        degraded: true,
      };
    }
  }

  @Get('facets/tools')
  async facetsTools() {
    await this.meili.health();
    return this.meili.getToolsFacets();
  }
}
