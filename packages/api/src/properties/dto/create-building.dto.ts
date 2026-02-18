import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
} from 'class-validator';

export class CreateBuildingDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  propertyCode?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  heating?: string;

  @IsString()
  @IsOptional()
  powerSupply?: string;

  @IsString()
  @IsOptional()
  buildingStructure?: string;

  @IsString()
  @IsOptional()
  lighting?: string;

  @IsString()
  @IsOptional()
  gridStructure?: string;

  @IsString()
  @IsOptional()
  gridFormat?: string;

  @IsString()
  @IsOptional()
  temperature?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  totalSqm?: number;

  @IsNumber()
  @IsOptional()
  availableSqm?: number;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsNumber()
  @IsOptional()
  clearHeight?: number;

  @IsNumber()
  @IsOptional()
  floorLoading?: number;

  @IsNumber()
  @IsOptional()
  serviceCharge?: number;

  @IsBoolean()
  @IsOptional()
  sprinkler?: boolean;

  @IsBoolean()
  @IsOptional()
  hydrantSystem?: boolean;

  @IsBoolean()
  @IsOptional()
  isuAuthorization?: boolean;

  @IsBoolean()
  @IsOptional()
  buildToSuit?: boolean;

  @IsArray()
  @IsOptional()
  polygonPoints?: Record<string, unknown>[];

  @IsDateString()
  @IsOptional()
  availableFrom?: string;

  @IsNumber()
  @IsOptional()
  locationId?: number;

  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsString()
  @IsOptional()
  ownerPhone?: string;

  @IsString()
  @IsOptional()
  ownerEmail?: string;

  @IsNumber()
  @IsOptional()
  minContractYears?: number;

  @IsNumber()
  @IsOptional()
  osmId?: number;

  @IsNumber()
  @IsOptional()
  developerId?: number;
}
