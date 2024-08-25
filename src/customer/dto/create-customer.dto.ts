import { IsString, IsNotEmpty, IsNumber, Min, Max, Length } from 'class-validator';

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
  day: number;

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  @Min(1900)
  year: number;
}
