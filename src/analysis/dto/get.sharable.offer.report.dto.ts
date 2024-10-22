import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsInt, IsOptional, Min } from "class-validator";

export class SharableOfferReportDto {
    @IsOptional()
    @IsDateString()
    fromDate?: string;
  
    @IsOptional()
    @IsDateString()
    toDate?: string;
  
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
  
    @IsOptional()
    @Type(() => Number)
    page: number = 1;
  
    @IsOptional()
    @Type(() => Number)
    limit: number = 10;
  }
  