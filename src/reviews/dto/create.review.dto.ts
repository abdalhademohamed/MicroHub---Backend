import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional } from "class-validator";
import { IsInt, Min, Max, IsString } from "class-validator";

export class CreateReviewDto {
  @ApiProperty({ description: "Rating for the newst review", example: 0 })
  @Min(1)
  @Max(5)
  newestRating: number;

  @ApiPropertyOptional({
    description: "Rating for the newst review",
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  oldestRating: number;

  employee: string;

  @ApiProperty({
    description: "Order ID to link the review",
    example: "order-id",
  })
  @IsString()
  order: string;

  @IsOptional()
  @IsString()
  comment_Before: string;
  @IsOptional()
  @IsString()
  comment_After: string;


}
