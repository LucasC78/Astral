import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { MeiliService } from './meili/meili.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meili: MeiliService,
  ) {}

  @Get()
  async getHealth() {
    let db: 'ok' | 'error' = 'ok';
    let meili: 'ok' | 'error' = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'error';
    }

    try {
      await this.meili.health();
    } catch {
      meili = 'error';
    }

    const ok = db === 'ok' && meili === 'ok';

    const payload = {
      ok,
      status: ok ? 'ok' : 'degraded',
      db,
      meili,
      timestamp: new Date().toISOString(),
    };

    if (!ok) {
      throw new ServiceUnavailableException(payload);
    }

    return payload;
  }
}
