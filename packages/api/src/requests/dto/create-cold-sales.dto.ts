import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateColdSalesDto {
  @IsArray()
  @IsNumber({}, { each: true })
  buildingIds!: number[];

  @IsArray()
  @IsNumber({}, { each: true })
  recipientPersonIds!: number[];

  @IsString()
  @IsOptional()
  message?: string;
}
