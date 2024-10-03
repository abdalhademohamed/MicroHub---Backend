import { IsNotEmpty, IsNumber, IsString, IsArray, IsOptional, IsBoolean, IsDateString, isString, IsISO8601 } from 'class-validator';

export class CreateSharableOfferDto {
  @IsString()
  @IsNotEmpty()
  offerName: string;

  @IsISO8601()
  startDateTime: string;

  @IsISO8601()
  endDateTime: string;

  @IsNumber()
  discountPercentage: number;



  @IsArray()
  serviceIds: string[]; // IDs of the services in the package

  @IsString()
  branchId: string; // IDs of the branches associated with the offer

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true; // Default to true
}
