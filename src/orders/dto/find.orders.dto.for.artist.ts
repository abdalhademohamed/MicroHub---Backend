import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  IsString,
} from "class-validator";
import { OrderStatus } from "../utils/order.status.enum";

export class FindOrdersByDayDto {
  @ApiProperty({ default: 1, description: "Page number" })
  @IsOptional()
  @IsInt()
  page: number = 1;

  @ApiProperty({ default: 10, description: "Limit of items per page" })
  @IsOptional()
  @IsInt()
  limit: number = 10;

  @IsOptional()
  @IsString()
  fromDate?: string; // Format: 'yyyy-MM-dd'

  @IsOptional()
  @IsString()
  filterText?: string; // Format: 'yyyy-MM-dd'

  @IsOptional()
  @IsString()
  toDate?: string; // Format: 'yyyy-MM-dd'
  // Update to allow multiple statuses, split by commas
  @IsOptional()
  @Transform(({ value }) =>
    value.split(",").map((status: string) => status.trim()),
  )
  @IsEnum(OrderStatus, { each: true }) // Ensure each value is a valid OrderStatus
  orderStatus?: OrderStatus[];

  @ApiProperty({
    enum: ["ASC", "DESC"],
    default: "ASC",
    description: "Sort direction",
  })
  @IsOptional()
  @IsEnum(["ASC", "DESC"])
  sort: "ASC" | "DESC" = "ASC"; // Sorting direction (ascending or descending)
}
