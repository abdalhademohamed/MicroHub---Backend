import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsPositive, isUUID, IsUUID } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ description: 'The URL of the service image' })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiProperty({ description: 'The name of the service in Arabic' })
  @IsString()
  @IsNotEmpty()
  arabic_Name: string;

  @ApiProperty({ description: 'The name of the service in English' })
  @IsString()
  @IsNotEmpty()
  english_Name: string;

  @ApiProperty({ description: 'The price of the service' })
  @IsNumber({}, { message: 'Price must be a number' })
  @IsPositive({ message: 'Price must be a positive number' })
  price: number;

  @ApiProperty({ description: 'The duration of the service in minutes' })
  @IsNumber({}, { message: 'Duration must be a number' })
  @IsPositive({ message: 'Duration must be a positive number' })
  duration_Mins: number;

  @ApiProperty({ description: 'The rootosh number of the service' })
  @IsNumber({}, { message: 'Rootosh number must be a number' })
  @IsPositive({ message: 'Rootosh number must be a positive number' })
  rootosh_Number: number;

  @ApiProperty({ description: 'The number of months before the service expires' })
  @IsNumber({}, { message: 'Months to expire must be a number' })
  @IsPositive({ message: 'Months to expire must be a positive number' })
  months_To_Expire: number;
}