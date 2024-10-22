import { ApiProperty, PartialType } from "@nestjs/swagger";
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEmail,
  Length,
  IsBoolean,
  IsNumber,
} from "class-validator";
import { CreateEmployeeDto } from "./create.employee.dto";

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiProperty({
    description: "The name of the employee in English", 
    example: "John Doe",
    required: false,
  })
  @IsString()
  @IsOptional()
  english_Name?: string;

  @ApiProperty({
    description: "The name of the employee in Arabic",
    example: "جون دو",
    required: false,
  })
  @IsString()
  @IsOptional()
  arabic_Name?: string;

  @ApiProperty({
    description:
      "The working hours of the employee, in a specific format or enum",
    example: "9AM - 5PM",
    required: false,
  })

  @IsNumber()
  @IsOptional()
  workingHours?: number;

  @ApiProperty({
    description: "The email address of the employee",
    example: "john.doe@example.com",
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: "The country code of the employee",
    example: "+1",
    required: false,
  })
  @IsString()
  @Length(1, 10)
  @IsOptional()
  countryCode?: string;

  @ApiProperty({
    description: "The phone number of the employee",
    example: "+1234567890",
    required: false,
  })
  @IsString()
  @Length(7, 15)
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({
    description: "The password for the employee account",
    example: "securePassword123",
    required: false,
  })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({
    description: "The UUID of the employee type",
    example: "e1d5f27e-4b54-4e5b-a6bc-99b295fb0c8c",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  employeeType?: string;

  @ApiProperty({
    description: "The UUID of the branch the employee belongs to",
    example: "d2b2c5f0-58a5-4d84-91db-b5c8c28b17a2",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiProperty({
    description: "The UUID of the position of the employee",
    example: "a44c8f1d-6c47-4e1c-b6d5-8d828bf0e1f6",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  position?: string;

  @ApiProperty({
    description: "Indicates if the employee is available or not",
    example: true,
    required: false,
  })
  //   @IsBoolean()
  @IsOptional()
  available?: boolean;

  @ApiProperty({
    description: "URL or path to the employee image",
    example: "http://example.com/image.jpg",
    required: false,
  })
  @IsString()
  @IsOptional()
  image?: string; // URL or path to image
}
