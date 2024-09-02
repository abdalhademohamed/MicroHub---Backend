import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsUUID, IsOptional, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateServiceDto {
  @ApiProperty({ description: 'The URL of the service image' })
  image?: string;

  @ApiProperty({ description: 'The name of the service in Arabic' })
  @IsString()
  @IsOptional()
  arabic_Name: string;

  @ApiProperty({ description: 'The name of the service in English' })
  @IsString()
  @IsOptional()
  english_Name: string;

  @ApiProperty({ description: 'The price of the service' })
  @IsNumber() 
  @IsPositive({ message: 'Price must be a positive number' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value)) // Convert string to float
  price: number;

  @ApiProperty({ description: 'The duration of the service in minutes' })
  @IsInt()
  @IsPositive({ message: 'Duration must be a positive number' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer
  duration_Mins: number;

  @ApiProperty({ description: 'The rootosh number of the service' })
  @IsInt()
  @IsPositive({ message: 'Rootosh number must be a positive number' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer
  rootosh_Number: number;

  @ApiProperty({ description: 'The number of months before the service expires' })
  @IsInt()
  @IsPositive({ message: 'Months to expire must be a positive number' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10)) // Convert string to integer
  months_To_Expire: number;
}
