import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDate, IsOptional, IsString } from "class-validator";

export class AnalysisDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  fromDate?: Date;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  toDate?: Date;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;
}
