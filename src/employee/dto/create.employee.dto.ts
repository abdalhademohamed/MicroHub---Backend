import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class CreateEmployeeDto {

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  english_Name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  arabic_Name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  employee_Type_English: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  employee_Type_Arabic: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  branch: string;
  
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  position: string;
}
