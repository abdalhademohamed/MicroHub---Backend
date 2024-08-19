import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { Postion } from '../utils/postion.enum';

export class CreatePositionDto {
  @IsEnum(Postion)
  @IsNotEmpty()
  role: Postion;

  @IsString()
  @IsNotEmpty()
  positionInEnglish: string;

  @IsString()
  @IsNotEmpty()
  positionInArabic: string;
}
