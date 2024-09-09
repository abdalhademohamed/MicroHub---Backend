import { IsString, IsNotEmpty, IsNumber, Min, Max, Length, IsOptional, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCustomerDto {

  @IsString()
  @IsNotEmpty()
  country_Code: string;

  @IsString()
  @IsNotEmpty()
  @Length(5, 15)
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  // @IsNumber()
  // @Min(1)
  // @Max(31)
  // @Type(() => Number) // Transform the form-data string into a number
  // day: number;

  // @IsNumber()
  // @Min(1)
  // @Max(12)
  // @Type(() => Number) // Transform the form-data string into a number
  // month: number;

  // @IsNumber()
  // @Min(1900)
  // @Type(() => Number) // Transform the form-data string into a number
  // year: number;
  @IsString()
  @IsNotEmpty()
  dateOfBirth: string; // Format: YYYY-MM-DD

  @IsOptional()
  @IsISO8601({}, { message: 'customStartTime must be a valid ISO 8601 date string' })
  @IsNotEmpty({ message: 'customStartTime must be provided if customEndTime is provided' })
  customStartTime?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'customEndTime must be a valid ISO 8601 date string' })
  @IsNotEmpty({ message: 'customEndTime must be provided if customStartTime is provided' })
  customEndTime?: string;


  
}
