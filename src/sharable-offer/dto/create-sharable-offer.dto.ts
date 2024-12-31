import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsDateString,
  isString,
  IsISO8601,
} from "class-validator";

export class CreateSharableOfferDto {
  @IsString()
  @IsNotEmpty()
  offerName: string;

  @IsISO8601()
  startDateTime: string;

  @IsISO8601()
  endDateTime: string;

  @IsNumber()
  discountPercentage: number;

  @IsArray()
  serviceIds: string[]; // IDs of the services in the package

  @ApiProperty({
    description: "IDs of the branches where the offer is available",
  })
  @IsArray()
  @IsNotEmpty()
  branchIds: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true; // Default to true
}
