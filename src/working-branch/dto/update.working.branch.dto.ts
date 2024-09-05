import { IsEnum, IsString, IsUUID, IsArray, ArrayNotEmpty } from 'class-validator';
import { WeekDays } from '../../branch/utils/days.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWorkingBranchDto {
  
  @ApiProperty({ description: 'The day of the week' })
  @IsEnum(WeekDays)
  dayOfWeek: WeekDays;



  @ApiProperty({ description: 'Array of working hours for the day', example: ['09:00', '10:00', '11:00'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  workingHours: string[];
}
