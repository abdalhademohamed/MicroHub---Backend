import { ApiProperty } from "@nestjs/swagger";
import {
  IsDecimal,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class CreateReceiptDto {
  @ApiProperty({ description: "Order ID", example: "order-id" })
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: "Message written on the receipt",
    example: "Thank you for your purchase!",
  })
  @IsOptional()
  @IsString()
  message?: string;

  // @ApiProperty({
  //   description: "Discount applied to the order (percentage)",
  //   example: 10,
  // })
  // @IsOptional()
  // @IsNumber({}, { message: "Discount must be a valid number" })
  // @Min(0, { message: "Discount cannot be negative" })
  // @Max(100, { message: "Discount cannot be more than 100" })
  // discount?: number;
}
