import { IsString, IsNotEmpty, IsNumber, Min, Max, Length, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  countryCode: string;

  @IsString()
  @IsNotEmpty()
  @Length(5, 15)
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsNumber()
  @Min(1)
  @Max(31)
  @Type(() => Number) // Transform the form-data string into a number
  day: number;

  @IsNumber()
  @Min(1)
  @Max(12)
  @Type(() => Number) // Transform the form-data string into a number
  month: number;

  @IsNumber()
  @Min(1900)
  @Type(() => Number) // Transform the form-data string into a number
  year: number;
}
