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
  @IsUUID()
  @IsNotEmpty()
  employeeType: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  branch: string;
  
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  position: string;
}
