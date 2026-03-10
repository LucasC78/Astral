import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ToolsService } from '../tools/tools.service';

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

function required(value: any, field: string, slug?: string) {
  const v = String(value ?? '').trim();
  if (!v) throw new Error(`Missing ${field}${slug ? ` (slug=${slug})` : ''}`);
  return v;
}

function normalize(input: ToolInput) {
  const slug = required(input.slug, 'slug').toLowerCase();

  return {
    slug,
    name: required(input.name, 'name', slug).trim(),
    description: required(input.description, 'description', slug).trim(),
    websiteUrl: required(input.websiteUrl, 'websiteUrl', slug).trim(),
    countryCode: required(input.countryCode, 'countryCode', slug)
      .trim()
      .toUpperCase(),
    category: required(input.category, 'category', slug).trim(),
    hostingRegion: required(input.hostingRegion, 'hostingRegion', slug).trim(),
    gdprLevel: required(input.gdprLevel, 'gdprLevel', slug).trim(),
    isOpenSource: Boolean(input.isOpenSource ?? false),

    // 🔹 Nouveau
    logoUrl: input.logoUrl?.trim() || undefined,

    // 🔹 Nouveau (sécurisé)
    tags: Array.isArray(input.tags)
      ? input.tags
          .map((t) => String(t).trim().toLowerCase())
          .filter((t) => t.length > 0)
      : [],
  };
}

async function main() {
  const args = process.argv.slice(2);

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

  console.log(`📥 Import JSON: ${fileRel}`);
  console.log(`🔎 Items: ${tools.length}`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const toolsService = app.get(ToolsService);

  let createdOrUpdated = 0;
  let failed = 0;

  for (const input of tools) {
    const slug = String(input?.slug ?? '')
      .trim()
      .toLowerCase();

    try {
      const dto = normalize(input);

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
        console.log(`✅ Progress: ${createdOrUpdated}/${tools.length}`);
      }
    } catch (e: any) {
      failed++;
      console.error(
        `❌ Failed (slug=${slug || 'unknown'}): ${e?.message ?? e}`,
      );
    }
  }

  await app.close();

  console.log('---');
  console.log(`✅ Imported (created/updated): ${createdOrUpdated}`);
  console.log(`❌ Failed: ${failed}`);
}

main().catch((e) => {
  console.error('❌ Import crashed:', e);
  process.exit(1);
});
