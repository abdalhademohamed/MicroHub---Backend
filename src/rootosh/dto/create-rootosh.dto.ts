import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, IsNotEmpty, IsDateString, IsInt, IsPositive } from "class-validator";

export class CreateRootoshDto {

  @ApiProperty({ description: "The name of the service in Arabic" })
  @IsString()
  arabic_Name: string;

  @ApiProperty({ description: "The name of the service in English" })
  @IsString()
  english_Name: string;
  @ApiProperty({ description: "The description of the rootosh" }) 
  @IsString()
  @IsNotEmpty() 
  description: string; 
 

  @ApiProperty({ description: "The ID of the related service" })
  @IsString() 
  @IsNotEmpty()
  serviceId: string; // Assuming service ID is a string

  @ApiProperty({ description: "Duration in days until the rootosh expires" })
  @IsInt()  // Assuming duration is in days (can be modified for other units)
  @IsNotEmpty()
  expireduration: number; // Duration in days (or other units)


  @ApiProperty({ description: "The duration of the service in minutes" })
  @IsInt()
  @IsPositive({ message: "Duration must be a positive number" })
  @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer
  duration_Mins: number;
}
