import {
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
  IsNotEmpty,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { WeekDays } from "../../branch/utils/days.enum";

export class CreateWorkingBranchDto {
  @ApiProperty({ description: "The day of the week" })
  @IsEnum(WeekDays, { message: "dayOfWeek must be a valid day of the week" })
  @IsNotEmpty()
  dayOfWeek: WeekDays;

  @ApiProperty({
    description: "Array of working hours for the day",
    example: ["09:00", "10:00", "11:00"],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  readonly workingHours: string[];
}
