import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsUUID, IsOptional, IsNotEmpty } from 'class-validator';
import { BranchEntity } from '../../branch/entities/branch.entity';
import { ServiceEntity } from '../../service/entities/service.entity';

export class CreateReservationDto {

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  country_Code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone_Number: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  client_FullName: string;

  // @ApiProperty()
  // @IsNumber()
  // @IsNotEmpty()
  // day: number;

  // @ApiProperty()
  // @IsNumber()
  // @IsNotEmpty()
  // month: number;

  // @ApiProperty()
  // @IsNumber()
  // @IsNotEmpty()
  // year: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  dateOfBirth: string; // Format: YYYY-MM-DD

  
  @ApiProperty()
  @IsNotEmpty()
  branch: BranchEntity 

  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  services: ServiceEntity[]
  
  @ApiProperty()
  @IsString()
  @IsOptional()
  deposit_Content: string; // Correct property name

}