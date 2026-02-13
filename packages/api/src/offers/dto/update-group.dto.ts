import {
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { PriceCalcOption } from '@prisma/client';

export class UpdateGroupDto {
  @IsNumber()
  @IsOptional()
  leaseTermMonths?: number;

  @IsNumber()
  @IsOptional()
  incentiveMonths?: number;

  @IsNumber()
  @IsOptional()
  earlyAccessMonths?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsEnum(PriceCalcOption)
  @IsOptional()
  priceCalcOption?: PriceCalcOption;

  @IsNumber()
  @IsOptional()
  warehouseRentPrice?: number;

  @IsNumber()
  @IsOptional()
  officeRentPrice?: number;

  @IsNumber()
  @IsOptional()
  sanitaryRentPrice?: number;

  @IsNumber()
  @IsOptional()
  othersRentPrice?: number;

  @IsNumber()
  @IsOptional()
  serviceCharge?: number;

  @IsString()
  @IsOptional()
  serviceChargeType?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  docks?: number;

  @IsNumber()
  @IsOptional()
  driveins?: number;

  @IsBoolean()
  @IsOptional()
  crossDock?: boolean;
}
