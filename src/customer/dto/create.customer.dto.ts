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

  @IsString()
  @IsNotEmpty()
  dateOfBirth: string; // Format: YYYY-MM-DD
}