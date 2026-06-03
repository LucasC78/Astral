import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrawlerService {
  constructor(private readonly prisma: PrismaService) {}

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
    if (currentDepth >= 1) return 0;

    let enqueued = 0;

    for (const url of urls.slice(0, 20)) {
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
          priority: 0,
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
          pathname.includes('/cart')
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
    return url.trim().toLowerCase().replace(/\/$/, '');
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
