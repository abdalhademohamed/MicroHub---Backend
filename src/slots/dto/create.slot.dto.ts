// import { ApiProperty } from "@nestjs/swagger";
// import { IsNumber, IsString, Max, Min } from "class-validator";

export class CreateSlotDto {
  // @ApiProperty()
  // @IsNumber()
  // @Min(new Date().getFullYear())
  year: number;

  // @ApiProperty()
  // @IsNumber()
  // @Max(12)
  // @Min(1)
  month: number;

  // @ApiProperty()
  // @IsNumber()
  // @Max(31)
  // @Min(1)
  day: number;

  // @ApiProperty()
  // @IsString()
  branch: string;

  workingHours: string[];
}