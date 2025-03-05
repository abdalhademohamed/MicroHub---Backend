import { IsDateString, IsOptional, IsString } from "class-validator";

export class UpdateTimeReservationDto {
  @IsOptional()
  @IsDateString()
  startTime: string;

  @IsString()
  day: string;
}
