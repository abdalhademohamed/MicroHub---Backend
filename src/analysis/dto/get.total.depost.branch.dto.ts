import { IsOptional, IsString, IsDateString } from "class-validator";

export class GetTotalDepositsDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
