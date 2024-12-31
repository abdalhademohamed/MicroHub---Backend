// dto/report.dto.ts
import { Type } from "class-transformer";
import {
  IsDateString,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";

export class GenerateOrderReportDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string; // Optional start date for filtering

  @IsOptional()
  @IsDateString()
  toDate?: string; // Optional end date for filtering

  @IsOptional()
  @IsString()
  branchId?: string; // Optional branch

  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit: number = 10;
}
