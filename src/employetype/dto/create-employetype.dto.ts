import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEmployeeTypeDto {
  @IsNotEmpty()
  @IsString()
  readonly typeEnglish: string;

  @IsNotEmpty()
  @IsString()
  readonly typeArabic: string;
}
