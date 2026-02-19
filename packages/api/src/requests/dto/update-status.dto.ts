import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class UpdateStatusDto {
  @IsEnum(RequestStatus)
  status!: RequestStatus;

  @IsString()
  @IsOptional()
  lostReason?: string;

  @IsString()
  @IsOptional()
  holdReason?: string;
}
