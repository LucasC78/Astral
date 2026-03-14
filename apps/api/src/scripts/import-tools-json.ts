import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ToolsService } from '../tools/tools.service';
import { PrismaService } from '../prisma/prisma.service';

type ToolInput = {
  slug: string;
  name: string;
  description: string;
  websiteUrl: string;
  countryCode: string;
  category: string;
  hostingRegion: string;
  gdprLevel: string;
  isOpenSource?: boolean;
  logoUrl?: string;
  tags?: string[];
};

const ALLOWED_GDPR_LEVELS = new Set(['low', 'medium', 'strong']);
const ALLOWED_HOSTING_REGIONS = new Set([
  'EU',
  'FR',
  'DE',
  'NL',
  'BE',
  'ES',
  'IT',
  'IE',
  'PL',
  'SE',
  'FI',
  'AT',
  'PT',
  'DK',
  'CZ',
  'LU',
  'EE',
  'LV',
  'LT',
  'CH',
  'NO',
  'UK',
]);

function required(value: unknown, field: string, slug?: string) {
  const v = String(value ?? '').trim();
  if (!v) throw new Error(`Missing ${field}${slug ? ` (slug=${slug})` : ''}`);
  return v;
}

function assertValidUrl(value: string, field: string, slug: string) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error();
    }
    return value;
  } catch {
    throw new Error(
      `Invalid ${field} (slug=${slug}): must be a valid http/https URL`,
    );
  }
}

function assertCountryCode(value: string, slug: string) {
  const cc = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) {
    throw new Error(
      `Invalid countryCode (slug=${slug}): must be exactly 2 uppercase letters`,
    );
  }
  return cc;
}

function assertGdprLevel(value: string, slug: string) {
  const normalized = value.trim().toLowerCase();
  if (!ALLOWED_GDPR_LEVELS.has(normalized)) {
    throw new Error(
      `Invalid gdprLevel (slug=${slug}): "${value}". Allowed: ${Array.from(
        ALLOWED_GDPR_LEVELS,
      ).join(', ')}`,
    );
  }
  return normalized;
}

function assertHostingRegion(value: string, slug: string) {
  const normalized = value.trim().toUpperCase();
  if (!ALLOWED_HOSTING_REGIONS.has(normalized)) {
    throw new Error(
      `Invalid hostingRegion (slug=${slug}): "${value}". Allowed: ${Array.from(
        ALLOWED_HOSTING_REGIONS,
      ).join(', ')}`,
    );
  }
  return normalized;
}

function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return Array.from(
    new Set(
      input
        .map((t) => String(t).trim().toLowerCase())
        .filter((t) => t.length > 0),
    ),
  );
}

function normalizeLogoUrl(value: unknown, slug: string) {
  const v = String(value ?? '').trim();
  if (!v) return undefined;
  return assertValidUrl(v, 'logoUrl', slug);
}

function normalize(input: ToolInput) {
  const slug = required(input.slug, 'slug').toLowerCase();

  const websiteUrl = assertValidUrl(
    required(input.websiteUrl, 'websiteUrl', slug).trim(),
    'websiteUrl',
    slug,
  );

  return {
    slug,
    name: required(input.name, 'name', slug).trim(),
    description: required(input.description, 'description', slug).trim(),
    websiteUrl,
    countryCode: assertCountryCode(
      required(input.countryCode, 'countryCode', slug),
      slug,
    ),
    category: required(input.category, 'category', slug).trim(),
    hostingRegion: assertHostingRegion(
      required(input.hostingRegion, 'hostingRegion', slug),
      slug,
    ),
    gdprLevel: assertGdprLevel(
      required(input.gdprLevel, 'gdprLevel', slug),
      slug,
    ),
    isOpenSource: Boolean(input.isOpenSource ?? false),
    logoUrl: normalizeLogoUrl(input.logoUrl, slug),
    tags: normalizeTags(input.tags),
  };
}

function findDuplicateSlugs(items: ToolInput[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of items) {
    const slug = String(item?.slug ?? '')
      .trim()
      .toLowerCase();

    if (!slug) continue;

    if (seen.has(slug)) duplicates.add(slug);
    else seen.add(slug);
  }

  return Array.from(duplicates);
}

async function main() {
  const args = process.argv.slice(2);

  const syncMode = args.includes('--sync');

  const fileArgIndex = args.findIndex((a) => a === '--file');
  const fileRel =
    fileArgIndex >= 0 ? args[fileArgIndex + 1] : 'data/tools.json';

  const filePath = path.resolve(process.cwd(), fileRel);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const tools = JSON.parse(raw) as ToolInput[];

  if (!Array.isArray(tools)) {
    console.error('❌ tools.json must be an array of objects');
    process.exit(1);
  }

  const duplicates = findDuplicateSlugs(tools);
  if (duplicates.length > 0) {
    console.error(`❌ Duplicate slugs in JSON: ${duplicates.join(', ')}`);
    process.exit(1);
  }

  console.log(`📥 Import JSON: ${fileRel}`);
  console.log(`🔎 Items: ${tools.length}`);
  console.log(`🔄 Sync mode: ${syncMode ? 'ON' : 'OFF'}`);

  // ✅ Validation complète avant de toucher à la DB
  let normalizedTools: ReturnType<typeof normalize>[];
  try {
    normalizedTools = tools.map(normalize);
  } catch (e: any) {
    console.error(`❌ Validation failed: ${e?.message ?? e}`);
    process.exit(1);
  }

  const jsonSlugs = normalizedTools.map((t) => t.slug);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const toolsService = app.get(ToolsService);
  const prisma = app.get(PrismaService);

  let createdOrUpdated = 0;
  let deleted = 0;
  let failed = 0;

  for (const dto of normalizedTools) {
    const slug = dto.slug;

    try {
      try {
        await toolsService.create(dto as any);
      } catch (e: any) {
        const isConflict =
          e?.name === 'ConflictException' ||
          e?.status === 409 ||
          String(e?.message ?? '')
            .toLowerCase()
            .includes('slug');

        if (!isConflict) throw e;

        await toolsService.updateBySlug(slug, dto as any);
      }

      createdOrUpdated++;

      if (createdOrUpdated % 25 === 0) {
        console.log(
          `✅ Progress: ${createdOrUpdated}/${normalizedTools.length}`,
        );
      }
    } catch (e: any) {
      failed++;
      console.error(
        `❌ Failed (slug=${slug || 'unknown'}): ${e?.message ?? e}`,
      );
    }
  }

  if (syncMode) {
    const dbTools = await prisma.tool.findMany({
      select: { slug: true },
    });

    const toDelete = dbTools
      .map((t) => t.slug)
      .filter((slug) => !jsonSlugs.includes(slug));

    if (toDelete.length > 0) {
      console.log(`🧹 Deleting ${toDelete.length} tool(s) absent from JSON...`);

      for (const slug of toDelete) {
        try {
          await toolsService.deleteBySlug(slug);
          deleted++;
          console.log(`🗑️ Deleted: ${slug}`);
        } catch (e: any) {
          failed++;
          console.error(`❌ Delete failed (slug=${slug}): ${e?.message ?? e}`);
        }
      }
    } else {
      console.log('🧹 Nothing to delete. DB already matches JSON.');
    }
  }

  await app.close();

  console.log('---');
  console.log(`✅ Imported (created/updated): ${createdOrUpdated}`);
  console.log(`🗑️ Deleted: ${deleted}`);
  console.log(`❌ Failed: ${failed}`);
}

main().catch((e) => {
  console.error('❌ Import crashed:', e);
  process.exit(1);
});
