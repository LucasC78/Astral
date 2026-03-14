import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;

  // category=Cloud&category=PaaS => value devient parfois array
  if (Array.isArray(value)) {
    const arr = value.map((v) => String(v).trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  }

  // category=Cloud,PaaS => CSV support
  const raw = String(value).trim();
  if (!raw) return undefined;

  const arr = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return arr.length ? arr : undefined;
}

export class SearchQuery {
  // 🔎 Recherche full-text
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? '' : String(value).trim()))
  @IsString()
  q: string = '';

  // 📄 Pagination
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // 🎯 Filtres (single ou multi : répétition ou CSV)

  @IsOptional()
  @Transform(({ value }) => {
    const arr = toStringArray(value);
    return arr?.map((v) => v.toUpperCase());
  })
  countryCode?: string[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  category?: string[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  hostingRegion?: string[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  gdprLevel?: string[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value)?.map((v) => v.toLowerCase()))
  tags?: string[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isOpenSource?: boolean;

  // ↕️ Tri
  @IsOptional()
  @IsString()
  @IsIn([
    'name:asc',
    'name:desc',
    'createdAt:asc',
    'createdAt:desc',
    'updatedAt:asc',
    'updatedAt:desc',
  ])
  sort?: string;
}
