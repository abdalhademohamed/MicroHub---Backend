import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsNotEmpty, Length, IsEmail, IsInt, Min, Max } from 'class-validator';

export class CreateEmployeeDto {

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  english_Name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  arabic_Name: string; 

  @IsNotEmpty()
  workingHours: string;  // Ensure this is between 1 and 10

  @IsEmail()
  email: string;


  @IsString()
  @Length(1, 10)
  countryCode: string;


  @IsString()
  @Length(7, 15)
  phoneNumber: string;

  @IsString()
  password: string; 

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



  @ApiProperty({ description: 'Image URL or path' })

  image?:string;  // 
}
