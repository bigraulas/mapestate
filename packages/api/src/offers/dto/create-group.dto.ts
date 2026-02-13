import { IsString, IsNotEmpty, IsNumber, IsArray } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  buildingId!: number;

  @IsArray()
  @IsNumber({}, { each: true })
  unitIds!: number[];
}
