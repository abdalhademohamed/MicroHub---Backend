import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min, IsEnum } from "class-validator";
import { WeekDays } from "../../branch/utils/days.enum";
import { Transform } from "class-transformer";

export class FilterBranchCalendarDto {
  @ApiProperty({ description: "Branch ID to filter by", example: "branch123" })
  @IsString()
  @IsOptional()
  branchId?: string;
  @ApiProperty({ description: "Page number for pagination", example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  page?: number;

  @ApiProperty({ description: "Number of items per page", example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  limit?: number;

  @ApiProperty({ description: "Day of the week to filter by", required: false })
  @IsOptional()
  @IsString()
  @IsEnum(WeekDays)
  dayOfWeek?: string;

  @ApiProperty({
    description: "Date for reservations in string format (e.g., 2024-09-05)",
    required: false,
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiProperty({
    description: "Order of reservations by start time",
    example: "ASC",
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(["ASC", "DESC"])
  order?: "ASC" | "DESC";

  // Additional properties for pagination response
  @ApiProperty({
    description: "Total number of reservations matching the criteria",
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsInt()
  total?: number;

  @ApiProperty({
    description: "Current page number",
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  currentPage?: number;

  @ApiProperty({
    description: "Total number of pages",
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsInt()
  totalPages?: number;
}
