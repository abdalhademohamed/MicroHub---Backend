import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsNotEmpty,
  IsDateString,
} from "class-validator";
import { Transform } from "class-transformer";

export class CreateReservationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone_Number: string;

  @ApiProperty()
  @IsString()
  branch: string;

  @ApiProperty({
    type: [String],
    description: "Array of service IDs",
    example: [
      "0414c556-e18a-452a-84e4-4f3813a4bf37",
      "b78d5614-b6a3-4d01-97e2-f9749d098265",
    ],
  })
  @IsOptional() // Make services optional
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      // Convert comma-separated string to array 
      return value.split(",").map((id) => id.trim());
    }
    // Return the value as-is if it's already an array or undefined
    return Array.isArray(value) ? value : [];
  })
  services?: string[]; // Optional field


  @IsOptional() // Make services optional
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      // Convert comma-separated string to array 
      return value.split(",").map((id) => id.trim());
    }
    // Return the value as-is if it's already an array or undefined
    return Array.isArray(value) ? value : [];
  })
  rootosh?: string[]; // Optional field
  
  @ApiProperty({ description: "Deposit amount" })
  @IsNumber({}, { message: "deposit must be a valid number" })
  @Transform(({ value }) => Number(value)) // Transform to number
  
  deposit: number;

  @ApiProperty()
  @IsDateString(
    {},
    { message: "customStartTime must be a valid ISO 8601 date string" },
  )
  @IsNotEmpty({
    message: "customStartTime must be provided if customEndTime is provided",
  })
  customStartTime?: string;

  // @ApiProperty()
  // @IsDateString(
  //   {},
  //   { message: "customEndTime must be a valid ISO 8601 date string" },
  // )
  // @IsNotEmpty({
  //   message: "customEndTime must be provided if customStartTime is provided",
  // })
  // customEndTime?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  deposit_Content: string; // Correct property name

  @IsString()
  @IsOptional()
  paymentId:string;

  @IsOptional()
  @IsString()
  offerId?: string; // New property for offer ID

  @IsOptional()
  @IsString()
  sharableOfferId?: string; // New property for offer ID

  @IsOptional()
  @IsString()
  couponCode?: string; // New property for offer ID
}
