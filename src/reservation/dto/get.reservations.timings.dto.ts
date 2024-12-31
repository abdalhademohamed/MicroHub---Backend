import {
  IsOptional,
  IsUUID,
  IsNumberString,
  IsDateString,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class GetReservationsTimesDto {
  @ApiProperty({ description: "Branch ID to filter", required: false })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty({ description: "Start date to filter from", required: false })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({ description: "End date to filter to", required: false })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiProperty({ description: "Page number", default: "1" })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiProperty({ description: "Limit of results per page", default: "10" })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
