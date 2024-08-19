import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { Postion } from '../utils/postion.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePositionDto {
  @ApiProperty()
  @IsEnum(Postion)
  @IsNotEmpty()
  role: Postion;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  positionInEnglish: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  positionInArabic: string;
  
}
