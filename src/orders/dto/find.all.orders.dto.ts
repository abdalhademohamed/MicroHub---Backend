import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from "class-validator";
import { Transform } from "class-transformer";
import { OrderStatus } from "../utils/order.status.enum";

export enum PaymentStatus {
  PAID = "paid",
  PARTIALLY_PAID = "partially paid", // Update here
}

export class FindOrdersDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;

  @IsOptional()
  @IsEnum(["asc", "desc"])
  sort?: "asc" | "desc" = "asc";

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsOptional()
  @IsString()
  fromDate?: string; // Format: 'yyyy-MM-dd'

  @IsOptional()
  @IsEnum(PaymentStatus) // Reference the updated PaymentStatus enum
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsEnum(OrderStatus)
  orderStatus?: OrderStatus;

  @IsOptional()
  @IsString()
  toDate?: string; // Format: 'yyyy-MM-dd'
  
  @IsOptional()
  @IsString()
  serviceId?: string; // New property to filter by specific service
}
