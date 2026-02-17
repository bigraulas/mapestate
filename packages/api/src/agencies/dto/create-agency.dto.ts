import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateAgencyDto {
  @IsString()
  name!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  ownerFirstName!: string;

  @IsString()
  ownerLastName!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;
}
