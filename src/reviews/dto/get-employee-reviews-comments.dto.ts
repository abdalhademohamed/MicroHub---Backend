import { IsUUID, IsOptional, IsEnum, IsDate, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export class GetEmployeeReviewsCommentsDto {


  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
    example: 1
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort order by creation date',
    enum: SortOrder,
    default: SortOrder.DESC,
    example: 'desc'
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sort?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: 'Filter results from this date',
    example: '2024-01-01'
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fromDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter results until this date',
    example: '2024-03-20'
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  toDate?: Date;
} 