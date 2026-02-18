import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  IsDateString,
} from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @IsNotEmpty()
  buildingId!: number;

  @IsObject()
  @IsOptional()
  warehouseSpace?: { sqm: number; rentPrice: number };

  @IsObject()
  @IsOptional()
  officeSpace?: { sqm: number; rentPrice: number };

  @IsObject()
  @IsOptional()
  sanitarySpace?: { sqm: number; rentPrice: number };

  @IsObject()
  @IsOptional()
  othersSpace?: { sqm: number; rentPrice: number };

  @IsNumber()
  @IsOptional()
  usefulHeight?: number;

  @IsBoolean()
  @IsOptional()
  hasOffice?: boolean;

  @IsNumber()
  @IsOptional()
  officeSqm?: number;

  @IsBoolean()
  @IsOptional()
  hasSanitary?: boolean;

  @IsNumber()
  @IsOptional()
  sanitarySqm?: number;

  @IsNumber()
  @IsOptional()
  warehousePrice?: number;

  @IsNumber()
  @IsOptional()
  officePrice?: number;

  @IsNumber()
  @IsOptional()
  maintenancePrice?: number;

  @IsString()
  @IsOptional()
  floorPlan?: string;

  @IsArray()
  @IsOptional()
  photos?: string[];

  @IsNumber()
  @IsOptional()
  docks?: number;

  @IsNumber()
  @IsOptional()
  driveins?: number;

  @IsBoolean()
  @IsOptional()
  crossDock?: boolean;

  @IsArray()
  @IsOptional()
  images?: string[];

  // Technical specs
  @IsString()
  @IsOptional()
  temperature?: string;

  @IsBoolean()
  @IsOptional()
  sprinkler?: boolean;

  @IsBoolean()
  @IsOptional()
  hydrantSystem?: boolean;

  @IsBoolean()
  @IsOptional()
  isuAuthorization?: boolean;

  @IsString()
  @IsOptional()
  heating?: string;

  @IsString()
  @IsOptional()
  buildingStructure?: string;

  @IsString()
  @IsOptional()
  gridStructure?: string;

  @IsString()
  @IsOptional()
  gridFormat?: string;

  @IsNumber()
  @IsOptional()
  floorLoading?: number;

  @IsString()
  @IsOptional()
  lighting?: string;

  // Commercial specs
  @IsNumber()
  @IsOptional()
  serviceCharge?: number;

  @IsDateString()
  @IsOptional()
  availableFrom?: string;

  @IsString()
  @IsOptional()
  contractLength?: string;

  @IsString()
  @IsOptional()
  expandingPossibilities?: string;

  // Sale price
  @IsNumber()
  @IsOptional()
  salePrice?: number;

  @IsBoolean()
  @IsOptional()
  salePriceVatIncluded?: boolean;
}
