import { Type } from "class-transformer";
import { IsOptional, IsString, IsInt, Min } from "class-validator";

export class GetPaymentMethodReportDto {
  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit: number = 10;
}
