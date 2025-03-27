import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class UpdateReservationDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  services: string[];

  @IsDateString()
  startTime: string;

  // @IsString()
  // day: string;
}
