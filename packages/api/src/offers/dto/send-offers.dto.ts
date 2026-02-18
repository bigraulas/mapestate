import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BuildingOverrideDto {
  @IsNumber()
  buildingId!: number;

  @IsNumber()
  @IsOptional()
  rentPrice?: number;

  @IsNumber()
  @IsOptional()
  serviceCharge?: number;
}

export class SendOffersDto {
  @IsNumber()
  dealId!: number;

  @IsArray()
  @IsNumber({}, { each: true })
  buildingIds!: number[];

  @IsString()
  @IsOptional()
  message?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BuildingOverrideDto)
  buildingOverrides?: BuildingOverrideDto[];
}
