import { IsOptional, IsString } from "class-validator";

export class UpdateEmployeeTypeDto {
  @IsOptional()
  @IsString()
  readonly typeEnglish?: string;

  @IsOptional()
  @IsString()
  readonly typeArabic?: string;
}
