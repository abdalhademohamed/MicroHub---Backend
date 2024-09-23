import { IsEnum, IsString, IsArray, ArrayNotEmpty } from "class-validator";
import { WeekDays } from "../../branch/utils/days.enum";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateWorkingBranchDto {
  @ApiProperty({ description: "The day of the week" })
  @IsEnum(WeekDays, {
    message:
      "dayOfWeek must be one of the following values: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday",
  })
  dayOfWeek: WeekDays;

  @ApiProperty({
    description: "Array of working hours for the day",
    example: [
      "12:00 AM",
      "01:00 AM",
      "02:00 AM",
      "03:00 AM",
      "04:00 AM",
      "05:00 AM",
      "06:00 AM",
      "07:00 AM",
      "08:00 AM",
      "09:00 AM",
      "10:00 AM",
      "11:00 AM",
      "12:00 PM",
    ],
  })
  @IsArray({ message: "workingHours must be an array" })
  @ArrayNotEmpty({ message: "workingHours should not be empty" })
  @IsString({
    each: true,
    message: "each value in workingHours must be a string",
  })
  workingHours: string[];
}
