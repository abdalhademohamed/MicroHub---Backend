import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsPositive, isUUID, IsUUID, IsOptional, isString } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ description: 'The URL of the service image' })
  
  image?: string;

  @ApiProperty({ description: 'The name of the service in Arabic' })
  @IsString()
  @IsOptional()  // If not always present
  arabic_Name: string;

  @ApiProperty({ description: 'The name of the service in English' })
  // @IsString()
  @IsOptional()  // If not always present
  english_Name: string;

  @ApiProperty({ description: 'The price of the service' })
  // @IsString()
  // @IsPositive({ message: 'Price must be a positive number' })
  @IsOptional()  // If not always present
  price: number;

  @ApiProperty({ description: 'The duration of the service in minutes' })
  // @IsString()
  // @IsPositive({ message: 'Duration must be a positive number' })
  @IsOptional()  // If not always present
  duration_Mins: number;

  @ApiProperty({ description: 'The rootosh number of the service' })
  // @IsString()
  // @IsPositive({ message: 'Rootosh number must be a positive number' })
  @IsOptional()  // If not always present
  rootosh_Number: number;

  @ApiProperty({ description: 'The number of months before the service expires' })
  // @IsString()
  // @IsPositive({ message: 'Months to expire must be a positive number' })
  @IsOptional()  // If not always present
  months_To_Expire: number;
}