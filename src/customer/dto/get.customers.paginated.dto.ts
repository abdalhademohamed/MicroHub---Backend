import {
    IsOptional,
    IsString,
    IsNumber,
    // IsDateString,
    // IsNotEmpty,
  } from 'class-validator';
  
  export class GetCustomerPaginatedsDto {
    // @IsOptional()
    // @IsNotEmpty()
    // branchId?: string;
  
    // @IsOptional()
    // @IsDateString()
    // fromDate?: string; // Format: YYYY-MM-DD
  
    // @IsOptional()
    // @IsDateString()
    // toDate?: string; // Format: YYYY-MM-DD
    @IsOptional()
    @IsString()
    keyword?: string; //
  
    @IsOptional()
    @IsNumber()
    page?: number = 1; // Default page
  
    @IsOptional()
    @IsNumber()
    limit?: number = 10; // Default limit
  }
  