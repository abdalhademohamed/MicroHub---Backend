import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsInt, IsDateString, Min } from "class-validator";

export class GetServiceReportDto {
  @ApiProperty({
    description: "Page number for pagination",
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit: number = 10;

  @ApiProperty({
    description: "Filter from this date (YYYY-MM-DD format)",
    example: "2023-01-01",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string; // Date string format, optional

  @ApiProperty({
    description: "Filter until this date (YYYY-MM-DD format)",
    example: "2023-12-31",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  toDate?: string; // Date string format, optional
}
