import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsDateString, IsInt } from "class-validator";

export class CreateRootoshDto {
  @ApiProperty({ description: "The name of the rootosh" })
  @IsString()
  @IsNotEmpty()
  name: string;

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
}
