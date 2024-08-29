import {
    IsString,
    IsNotEmpty,
    IsArray,
    IsUUID,
    IsNumber,
    Min,
    Max,
    IsDate,
    IsDateString,
    IsISO8601,
 
  } from 'class-validator';
  import { ApiProperty } from '@nestjs/swagger';
  
  export class CreateOfferDto {
    @ApiProperty({ description: 'The name of the offer' })
    @IsString()
    @IsNotEmpty()
    offerName: string;
  
    @ApiProperty({ description: 'IDs of the services included in the offer' })
    @IsArray()
    @IsNotEmpty()
    serviceIds: string[];
  
    @ApiProperty({ description: 'The start date and time of the offer in ISO 8601 format' })
    @IsString()
    @IsNotEmpty()
    @IsISO8601()
    startDateTime: string;
  
    @ApiProperty({ description: 'The end date and time of the offer in ISO 8601 format' })
    @IsString()
    @IsNotEmpty()
    @IsISO8601()
    endDateTime: string;


    @ApiProperty({ description: 'IDs of the branches where the offer is available' })
    @IsArray()
    @IsNotEmpty()
    branchIds: string[];
  
    @ApiProperty({ description: 'Discount percentage for the offer' })
    @IsNumber()
    @Min(0)
    @Max(100)
    discountPercentage: number;

    
  }
  