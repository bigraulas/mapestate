import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class SendOffersDto {
  @IsNumber()
  dealId!: number;

  @IsArray()
  @IsNumber({}, { each: true })
  buildingIds!: number[];

  @IsString()
  @IsOptional()
  message?: string;
}
