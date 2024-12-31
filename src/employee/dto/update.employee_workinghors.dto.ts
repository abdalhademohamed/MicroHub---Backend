import { IsNumber, IsOptional } from "class-validator";
export class EmployeeWorkingHoursDto {
  @IsNumber()
  @IsOptional()
  workingHours: number;
}
