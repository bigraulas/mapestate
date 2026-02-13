import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePersonDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  jobTitle?: string;

  @IsArray()
  @IsOptional()
  emails?: string[] = [];

  @IsArray()
  @IsOptional()
  phones?: string[] = [];

  @IsString()
  @IsOptional()
  source?: string;

  @IsInt()
  @IsOptional()
  companyId?: number;

  @IsInt()
  @IsOptional()
  labelId?: number;
}
