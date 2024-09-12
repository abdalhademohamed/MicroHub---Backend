import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsUUID, IsOptional, IsNotEmpty, IsDateString } from 'class-validator';
import { BranchEntity } from '../../branch/entities/branch.entity';
import { ServiceEntity } from '../../service/entities/service.entity';

export class CreateReservationDto {

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone_Number: string;

  

  @ApiProperty()
  @IsString()
  branch: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  services: string[];



  @ApiProperty()
  @IsNumber()
  deposit: number;









  @ApiProperty()
  @IsDateString(
    {},
    { message: "customStartTime must be a valid ISO 8601 date string" },
  )
  @IsNotEmpty({
    message: "customStartTime must be provided if customEndTime is provided",
  })
  customStartTime?: string;



  @ApiProperty()
  @IsDateString(
    {},
    { message: "customEndTime must be a valid ISO 8601 date string" },
  )
  @IsNotEmpty({
    message: "customEndTime must be provided if customStartTime is provided",
  })
  customEndTime?: string;



    
  @ApiProperty()
  @IsString()
  @IsOptional()
  deposit_Content: string; // Correct property name

}