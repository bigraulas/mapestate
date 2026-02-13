import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDateString,
} from 'class-validator';
import { ActivityType } from '@prisma/client';

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsDateString()
  date!: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsBoolean()
  @IsOptional()
  done?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(ActivityType)
  activityType!: ActivityType;

  @IsNumber()
  @IsOptional()
  companyId?: number;

  @IsNumber()
  @IsOptional()
  requestId?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  personIds?: number[];
}
