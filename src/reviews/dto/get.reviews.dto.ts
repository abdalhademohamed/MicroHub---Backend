import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min, IsIn } from "class-validator";

export class GetReviewsDto {
  @ApiProperty({ description: "Page number for pagination", example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: "Number of reviews per page", example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ description: "Sort order", example: "asc" })
  @IsOptional()
  @IsString()
  @IsIn(["asc", "desc"])
  sort?: "asc" | "desc" = "asc";
}
