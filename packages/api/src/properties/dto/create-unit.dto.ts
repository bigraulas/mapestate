import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
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
}
