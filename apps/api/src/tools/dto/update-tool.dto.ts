import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';

export class UpdateToolDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  hostingRegion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  gdprLevel?: string;

  @IsOptional()
  @IsBoolean()
  isOpenSource?: boolean;

  // 🔹 Nouveau champ : logo
  @IsOptional()
  @IsUrl({ require_protocol: true })
  logoUrl?: string;

  // 🔹 Nouveau champ : tags
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  @ArrayMaxSize(20)
  tags?: string[];
}
