import { IsOptional, IsString, IsDateString } from 'class-validator';

export class GetTotalRefundsDto {
  @IsOptional()
  @IsString()
  branchId?: string; // Optional branch ID to filter refunds by specific branch

  @IsOptional()
  @IsDateString()
  fromDate?: string; // Optional start date for filtering refunds

  @IsOptional()
  @IsDateString()
  toDate?: string; // Optional end date for filtering refunds
}
