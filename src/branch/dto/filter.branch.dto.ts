import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min, IsEnum } from "class-validator";
import { Transform } from "class-transformer";

export class FilterBranchesDto {
  @ApiProperty({ description: "Page number for pagination", example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number(value), { toClassOnly: true })
  page?: number;

  @ApiProperty({ description: "Number of items per page", example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number(value), { toClassOnly: true })
  limit?: number;

  @ApiProperty({
    description: "Order of sorting by branch name",
    example: "ASC",
    enum: ["ASC", "DESC"],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(["ASC", "DESC"])
  order?: "ASC" | "DESC";
}
