import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
} from "class-validator";

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 3, { message: "Country code must be 2 or 3 characters long" })
  country_Code: string;

  // @IsPhoneNumber(null, { message: "Invalid phone number" })
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsOptional()
  dateOfBirth: string; // Format: YYYY-MM-DD
}
