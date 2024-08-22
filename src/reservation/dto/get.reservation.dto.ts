import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsPositive } from 'class-validator';

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
  
}
