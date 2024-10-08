import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateReceiptFromReservationIdDto {
  @ApiProperty({ description: "Reservation ID", example: "reservation-id" })
  @IsUUID()
  reservationId: string;

  @ApiProperty({
    description: "Message written on the receipt",
    example: "Thank you for your purchase!",
  })
  @IsOptional()
  @IsString()
  message?: string;
}
