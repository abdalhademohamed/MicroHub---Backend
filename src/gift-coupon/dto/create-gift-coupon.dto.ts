import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateGiftCouponDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  orderId: string; // ID of the sharable offer

  @IsNotEmpty()
  @IsString()
  @IsUUID()
  customerId: string; // ID of the customer
}
