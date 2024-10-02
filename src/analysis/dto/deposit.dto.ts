import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDate, IsOptional, IsString } from "class-validator";

export class AnalysisDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  start_Time?: Date;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  end_Time?: Date;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;
}
