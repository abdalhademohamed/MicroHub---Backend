import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { BranchEntity } from '../entities/branch.entity';

export class FilterBranchesDto {
  @ApiProperty({ description: 'Page number for pagination', example: 1 })
  @IsInt()
  @Min(1)
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  @IsInt()
  @Min(1)
  limit: number;

  @ApiProperty({ description: 'Branch name to filter by', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Location to filter by', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: 'Branch ID to filter by', required: false })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ description: 'List of branches matching the criteria', type: [BranchEntity], required: false })
  @IsOptional()
  items?: BranchEntity[];

  @ApiProperty({ description: 'Total number of branches matching the criteria', required: false })
  @IsOptional()
  total?: number;

  @ApiProperty({ description: 'Current page number', required: false })
  @IsOptional()
  currentPage?: number;

  @ApiProperty({ description: 'Total number of pages', required: false })
  @IsOptional()
  totalPages?: number;
}
