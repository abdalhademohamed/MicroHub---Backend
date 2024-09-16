import { IsDateString, IsOptional } from "class-validator";

export class UpdateTimeReservationDto {
  @IsOptional()
  @IsDateString()
  startTime: string;
}
