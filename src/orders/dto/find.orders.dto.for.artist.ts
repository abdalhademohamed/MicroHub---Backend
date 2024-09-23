import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsInt, IsEnum, IsDateString } from "class-validator";

export class FindOrdersByDayDto {
  @ApiProperty({ default: 1, description: "Page number" })
  @IsOptional()
  @IsInt()
  page: number = 1;

  @ApiProperty({ default: 10, description: "Limit of items per page" })
  @IsOptional()
  @IsInt()
  limit: number = 10;

  @ApiProperty({
    description: "Date of the orders (YYYY-MM-DD)",
    required: true,
  })
  @IsDateString()
  dayDate: string; // The specific day for filtering orders

  @ApiProperty({
    enum: ["ASC", "DESC"],
    default: "ASC",
    description: "Sort direction",
  })
  @IsOptional()
  @IsEnum(["ASC", "DESC"])
  sort: "ASC" | "DESC" = "ASC"; // Sorting direction (ascending or descending)
}
