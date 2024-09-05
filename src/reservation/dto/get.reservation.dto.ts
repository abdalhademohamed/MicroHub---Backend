import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsPositive, IsString } from 'class-validator';

export class GetReservationsDto {
  @ApiProperty()
  @IsOptional()
  @IsNumber()
  day?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  month?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiProperty()
  @IsOptional()
  page?: number;

  @ApiProperty()
  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsString()
  branchId?: string; // Optional filter for branchId
  
}
