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
}
