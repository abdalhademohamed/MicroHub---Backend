import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class CreateEmployeeDto {

  
  @IsString()
  @IsNotEmpty()
  english_Name: string;

  @IsString()
  @IsNotEmpty()
  arabic_Name: string;

  @IsString()
  @IsNotEmpty()
  employee_Type_English: string;

  @IsString()
  @IsNotEmpty()
  employee_Type_Arabic: string;

  @IsUUID()
  @IsNotEmpty()
  branch: string;

  @IsUUID()
  @IsNotEmpty()
  position: string;
}
