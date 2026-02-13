import { IsOptional, IsString } from 'class-validator';

export class CreateLabelDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  color?: string = '#3B82F6';
}
