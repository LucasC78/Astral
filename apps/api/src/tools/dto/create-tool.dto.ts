import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';

export class CreateToolDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @IsUrl({ require_protocol: true })
  websiteUrl!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  countryCode!: string; // ex: "FR"

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  hostingRegion!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  gdprLevel!: string;

  @IsOptional()
  @IsBoolean()
  isOpenSource?: boolean = false;

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
