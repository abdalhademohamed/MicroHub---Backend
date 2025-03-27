import { IsOptional, IsString } from "class-validator";

export class UpdateBranchReservationDto {
  @IsString()
  branch: string;

  @IsOptional()
  @IsString()
  startTime: string;

  // @IsString()
  // day: string;
}
