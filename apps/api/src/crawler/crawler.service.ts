import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { MeiliService } from '../meili/meili.service';

@Injectable()
export class CrawlerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meili: MeiliService,
  ) {}

  async runOneJob() {
    const job = await this.prisma.crawlQueue.findFirst({
      where: {
        status: 'PENDING',
        nextRunAt: {
          lte: new Date(),
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    if (!job) {
      return {
        message: 'No pending crawl job',
        job: null,
      };
    }

    const processingJob = await this.prisma.crawlQueue.update({
      where: { id: job.id },
      data: {
        status: 'PROCESSING',
        lockedAt: new Date(),
        attempts: {
          increment: 1,
        },
        lastError: null,
      },
    });

    try {
      const html = await this.fetchHtml(processingJob.url);

      const title = this.extractTitle(html);
      const description = this.extractDescription(html);
      const content = this.extractContent(html);
      const links = this.extractLinks(html, processingJob.url);
      const filteredLinks = this.filterUsefulLinks(
        links,
        processingJob.domain,
        processingJob.url,
      );
      const images = this.extractImages(html, processingJob.url);

      let savedUrls = 0;
      let savedImages = 0;
      let enqueuedJobs = 0;

      if (processingJob.toolId) {
        await this.savePageContent(
          processingJob.toolId,
          processingJob.url,
          title,
          description,
          content,
        );

        savedUrls = await this.saveToolUrls(
          processingJob.toolId,
          filteredLinks,
        );

        savedImages = await this.saveToolImages(
          processingJob.toolId,
          images,
          processingJob.url,
        );

        enqueuedJobs = await this.enqueueDiscoveredUrls(
          processingJob.toolId,
          filteredLinks,
          processingJob.depth,
        );
      }

      const doneJob = await this.prisma.crawlQueue.update({
        where: { id: processingJob.id },
        data: {
          status: 'DONE',
          lockedAt: null,
          lastError: null,
        },
      });

      return {
        message: 'Crawl job processed',
        job: doneJob,
        result: {
          url: processingJob.url,
          title,
          htmlLength: html.length,
          linksCount: filteredLinks.length,
          imagesCount: images.length,
          savedUrls,
          savedImages,
          enqueuedJobs,
          sampleLinks: filteredLinks.slice(0, 10),
          sampleImages: images.slice(0, 10),
        },
      };
    } catch (e: any) {
      const message = String(e?.message ?? e ?? 'Unknown crawler error');

      const failedJob = await this.prisma.crawlQueue.update({
        where: { id: processingJob.id },
        data: {
          status: 'FAILED',
          lockedAt: null,
          lastError: message,
        },
      });

      return {
        message: 'Crawl job failed',
        job: failedJob,
        error: message,
      };
    }
  }

  async runBatch(limit = 5) {
    const safeLimit = Math.min(Math.max(limit, 1), 10);
    const results: Awaited<ReturnType<typeof this.runOneJob>>[] = [];

    for (let i = 0; i < safeLimit; i++) {
      const result = await this.runOneJob();
      results.push(result);

      if (!result.job) break;
    }

    return {
      message: 'Crawl batch processed',
      limit: safeLimit,
      processed: results.filter((r) => r.job !== null).length,
      results,
    };
  }

  async listJobs() {
    return this.prisma.crawlQueue.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  private async saveToolUrls(toolId: number, urls: string[]) {
    let saved = 0;

    for (const url of urls.slice(0, 100)) {
      const normalizedUrl = this.normalizeUrl(url);

      await this.prisma.toolUrl.upsert({
        where: {
          toolId_normalizedUrl: {
            toolId,
            normalizedUrl,
          },
        },
        update: {
          url,
          isActive: true,
          lastSeenAt: new Date(),
        },
        create: {
          toolId,
          url,
          normalizedUrl,
          domain: this.extractDomain(url),
          type: this.guessUrlType(url),
          isPrimary: false,
          isActive: true,
          lastSeenAt: new Date(),
        },
      });

      saved++;
    }

    return saved;
  }

  private async saveToolImages(
    toolId: number,
    images: string[],
    sourcePageUrl: string,
  ) {
    let saved = 0;

    for (const url of images.slice(0, 50)) {
      const normalizedUrl = this.normalizeUrl(url);

      await this.prisma.toolImage.upsert({
        where: {
          toolId_normalizedUrl: {
            toolId,
            normalizedUrl,
          },
        },
        update: {
          url,
          sourcePageUrl,
          lastSeenAt: new Date(),
        },
        create: {
          toolId,
          url,
          normalizedUrl,
          type: this.guessImageType(url),
          isPrimary: false,
          sourcePageUrl,
          lastSeenAt: new Date(),
        },
      });

      saved++;
    }

    return saved;
  }

  private async enqueueDiscoveredUrls(
    toolId: number,
    urls: string[],
    currentDepth: number,
  ) {
    const maxDepth = Number(process.env.CRAWLER_MAX_DEPTH ?? 2);
    const maxLinksPerPage = Number(
      process.env.CRAWLER_MAX_LINKS_PER_PAGE ?? 30,
    );

    if (currentDepth >= maxDepth) return 0;

    let enqueued = 0;

    for (const url of urls.slice(0, maxLinksPerPage)) {
      const normalizedUrl = this.normalizeUrl(url);

      const existingJob = await this.prisma.crawlQueue.findFirst({
        where: {
          toolId,
          normalizedUrl,
        },
      });

      if (existingJob) continue;

      await this.prisma.crawlQueue.create({
        data: {
          toolId,
          url,
          normalizedUrl,
          domain: this.extractDomain(url),
          status: 'PENDING',
          jobType: 'DISCOVER',
          priority: Math.max(0, 10 - currentDepth),
          depth: currentDepth + 1,
          attempts: 0,
          nextRunAt: new Date(),
        },
      });

      enqueued++;
    }

    return enqueued;
  }

  private async fetchHtml(url: string) {
    const res = await fetch(url, {
      headers: {
        'user-agent':
          'AstralBot/0.1 (+https://astral.local; crawler for search indexing)',
        accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type') ?? '';

    if (!contentType.includes('text/html')) {
      throw new Error(`Unsupported content-type: ${contentType}`);
    }

    return res.text();
  }

  private extractTitle(html: string) {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return this.cleanText(match?.[1] ?? null);
  }

  private extractLinks(html: string, baseUrl: string) {
    const links = new Set<string>();
    const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;

    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null) {
      const href = match[1];
      const absoluteUrl = this.toAbsoluteUrl(href, baseUrl);

      if (absoluteUrl) {
        links.add(absoluteUrl);
      }
    }

    return Array.from(links);
  }

  private extractImages(html: string, baseUrl: string) {
    const images = new Set<string>();
    const regex = /<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi;

    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null) {
      const src = match[1];
      const absoluteUrl = this.toAbsoluteUrl(src, baseUrl);

      if (absoluteUrl) {
        images.add(absoluteUrl);
      }
    }

    return Array.from(images);
  }

  private extractDescription(html: string) {
    const match = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
    );

    return this.cleanText(match?.[1] ?? null);
  }

  private extractContent(html: string) {
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.slice(0, 50000);
  }

  private async savePageContent(
    toolId: number,
    url: string,
    title: string | null,
    description: string | null,
    content: string | null,
  ) {
    const normalizedUrl = this.normalizeUrl(url);

    const page = await this.prisma.pageContent.upsert({
      where: {
        toolId_normalizedUrl: {
          toolId,
          normalizedUrl,
        },
      },
      update: {
        title,
        description,
        content,
      },
      create: {
        toolId,
        url,
        normalizedUrl,
        title,
        description,
        content,
      },
      include: {
        tool: true,
      },
    });

    try {
      await this.meili.configurePagesIndex();

      await this.meili.indexPages([
        {
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
        },
      ]);
    } catch (e) {
      console.error('[Crawler] Auto-index page failed:', e);
    }
  }

  private filterUsefulLinks(
    links: string[],
    jobDomain: string | null,
    jobUrl: string,
  ) {
    const allowedDomain = jobDomain || this.extractDomain(jobUrl);

    return links.filter((url) => {
      try {
        const parsed = new URL(url);
        const hostname = parsed.hostname;
        const pathname = parsed.pathname.toLowerCase();

        if (allowedDomain && hostname !== allowedDomain) return false;

        if (
          url.includes('/auth') ||
          url.includes('/billing') ||
          url.includes('/support') ||
          url.includes('manager.') ||
          pathname.includes('/login') ||
          pathname.includes('/signin') ||
          pathname.includes('/account') ||
          pathname.includes('/cart') ||
          pathname.includes('/legal') ||
          pathname.includes('/privacy') ||
          pathname.includes('/cookies') ||
          pathname.includes('/terms') ||
          pathname.includes('/press') ||
          pathname.includes('/news') ||
          pathname.includes('/events') ||
          pathname.includes('/careers') ||
          pathname.includes('/jobs') ||
          pathname.includes('/blog') ||
          pathname.includes('/events') ||
          pathname.includes('/vivatech') ||
          pathname.includes('/webinars') ||
          pathname.includes('/press') ||
          pathname.includes('/news') ||
          pathname.includes('/contact')
        ) {
          return false;
        }

        return true;
      } catch {
        return false;
      }
    });
  }

  private toAbsoluteUrl(value: string, baseUrl: string) {
    try {
      if (!value) return null;

      const trimmed = value.trim();

      if (
        trimmed.startsWith('#') ||
        trimmed.startsWith('mailto:') ||
        trimmed.startsWith('tel:') ||
        trimmed.startsWith('javascript:')
      ) {
        return null;
      }

      return new URL(trimmed, baseUrl).toString();
    } catch {
      return null;
    }
  }

  private normalizeUrl(url: string) {
    try {
      const parsed = new URL(url.trim());

      parsed.hash = '';

      const paramsToRemove = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'fbclid',
        'gclid',
        'msclkid',
      ];

      for (const param of paramsToRemove) {
        parsed.searchParams.delete(param);
      }

      parsed.hostname = parsed.hostname.toLowerCase();

      let normalized = parsed.toString();

      if (normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
      }

      return normalized.toLowerCase();
    } catch {
      return url.trim().toLowerCase().replace(/\/$/, '');
    }
  }

  private extractDomain(url: string) {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  private guessUrlType(url: string) {
    const lower = url.toLowerCase();

    if (lower.includes('/pricing') || lower.includes('/tarif')) {
      return 'PRICING';
    }

    if (lower.includes('/docs') || lower.includes('/documentation')) {
      return 'DOCS';
    }

    if (lower.includes('github.com')) return 'GITHUB';
    if (lower.includes('linkedin.com')) return 'LINKEDIN';
    if (lower.includes('/contact')) return 'CONTACT';

    return 'OTHER';
  }

  private guessImageType(url: string) {
    const lower = url.toLowerCase();

    if (lower.includes('favicon')) return 'FAVICON';
    if (lower.includes('logo')) return 'LOGO';
    if (lower.includes('banner')) return 'BANNER';

    return 'OTHER';
  }

  private cleanText(value: string | null) {
    if (!value) return null;

    return value
      .replace(/\s+/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}
