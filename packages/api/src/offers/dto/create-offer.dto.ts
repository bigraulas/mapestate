import { IsNumber } from 'class-validator';

export class CreateOfferDto {
  @IsNumber()
  requestId!: number;
}
