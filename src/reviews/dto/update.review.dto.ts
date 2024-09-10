import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';


export class UpdateReviewDto {
  @ApiProperty({ description: 'Total number of reviews', example: 0 })
  @IsInt()
  @Min(0)
  totalReviews: number;

  @ApiProperty({ description: 'Number of newest reviews', example: 0 })
  @IsInt()
  @Min(0)
  newestReviews: number;

  @ApiProperty({ description: 'Number of oldest reviews', example: 0 })
  @IsInt()
  @Min(0)
  oldestReviews: number;
}
