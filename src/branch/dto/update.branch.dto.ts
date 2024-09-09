import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateBranchDto {
  @ApiProperty({ description: 'Branch name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Location URL of the branch', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: 'Image URL or path', required: false })
  @IsString()
  @IsOptional()
  image?: string; // Optional for updates
}
