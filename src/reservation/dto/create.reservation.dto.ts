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

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  day: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  month: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  year: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reservation_Time_From: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reservation_Time_To: string;

  @ApiProperty()
  @IsNotEmpty()
  branch: BranchEntity 

  @ApiProperty()
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsNotEmpty()
  services: ServiceEntity[]

  @ApiProperty()
  @IsOptional()
  @IsString()
  deposit_Content?: string; // Optional deposit content
  
}
