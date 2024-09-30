import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

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
}
