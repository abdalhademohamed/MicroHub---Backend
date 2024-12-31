import {
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsEnum,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

enum SortOrder {
  ASC = "ASC",
  DESC = "DESC",
}
export class GetReceiptsDto {
  @ApiProperty({
    required: false,
    description: "Start date for filtering receipts",
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({
    required: false,
    description: "End date for filtering receipts",
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiProperty({
    required: false,
    default: 1,
    description: "Page number for pagination",
  })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiProperty({
    required: false,
    default: 10,
    description: "Number of receipts per page",
  })
  @IsOptional()
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsEnum(SortOrder)
  sort: SortOrder = SortOrder.ASC;

  @IsOptional()
  @IsString()
  branchId?: string; // Optional branch ID for filtering
}
