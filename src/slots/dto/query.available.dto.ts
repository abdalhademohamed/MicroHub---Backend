import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional } from "class-validator";

export class AvailableQueryDto {
  @ApiProperty()
  @IsNumber()
  month: number;
  @ApiProperty()
  @IsNumber()
  day: number;
  @ApiProperty()
  @IsNumber()
  year: number;
  @ApiProperty()
  @IsNumber()
  duration: number;
}
