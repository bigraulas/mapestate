import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsDateString,
} from 'class-validator';
import { RequestType, DealType } from '@prisma/client';

export class CreateRequestDto {
  @IsEnum(DealType)
  @IsOptional()
  dealType?: DealType;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @IsOptional()
  numberOfSqm?: number;

  @IsNumber()
  @IsOptional()
  estimatedFeeValue?: number;

  @IsNumber()
  @IsOptional()
  contractPeriod?: number;

  @IsNumber()
  @IsOptional()
  breakOptionAfter?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsEnum(RequestType)
  @IsOptional()
  requestType?: RequestType;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  companyId?: number;

  @IsNumber()
  @IsOptional()
  personId?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  locationIds?: number[];
}
