import { IsString, IsOptional, IsNumber } from "class-validator";

export class EmployeeDto {
  @IsString()
  id: string;

  @IsString()
  username: string;

  @IsString()
  email: string;

  @IsString()
  role: string;

  @IsString()
  englishName: string;

  @IsString()
  arabicName: string;

  @IsString()
  workingHours: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  image: string;

  @IsOptional()
  @IsNumber()
  totalReview?: number; // Ensure this is a number
}
