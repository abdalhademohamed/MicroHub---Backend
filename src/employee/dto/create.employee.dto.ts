import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsEmail,
  Length,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
} from "class-validator";

export class CreateEmployeeDto {
  @ApiProperty({
    description: "The name of the employee in English",
    example: "John Doe",
  })
  @IsString()
  @IsNotEmpty()
  english_Name: string;

  @ApiProperty({
    description: "The name of the employee in Arabic",
    example: "جون دو",
  })
  @IsString()
  @IsNotEmpty()
  arabic_Name: string;

  @ApiProperty({
    description:
      "The working hours of the employee, in a specific format or enum",
    example: "9AM - 5PM",
  })
  @IsNumber()
  @IsNotEmpty()
  workingHours: number; // Ensure this matches your expected format or enum

  @ApiProperty({
    description: "The email address of the employee",
    example: "john.doe@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "The country code of the employee",
    example: "+1",
  })
  @IsString()
  @Length(1, 10)
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({
    description: "The phone number of the employee",
    example: "+1234567890",
  })
  @IsString()
  @Length(7, 15)
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: "The password for the employee account",
    example: "securePassword123",
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: "The UUID of the employee type",
    example: "e1d5f27e-4b54-4e5b-a6bc-99b295fb0c8c",
  })
  @IsUUID()
  @IsNotEmpty()
  employeeType: string;

  @ApiProperty({
    description: "The UUID of the branch the employee belongs to",
    example: "d2b2c5f0-58a5-4d84-91db-b5c8c28b17a2",
  })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({
    description: "The UUID of the position of the employee",
    example: "a44c8f1d-6c47-4e1c-b6d5-8d828bf0e1f6",
  })
  @IsUUID()
  @IsNotEmpty()
  position: string;

  @ApiProperty({
    description: "Indicates if the employee is available or not",
    example: true,
  })
  // @IsBoolean()
  @IsNotEmpty()
  available: boolean; // Changed to boolean for availability

  @ApiProperty({
    description: "URL or path to the employee image",
    example: "http://example.com/image.jpg",
  })
  @IsOptional() // Make it optional if not always required
  @IsString()
  image?: string; // URL or path to image
}
