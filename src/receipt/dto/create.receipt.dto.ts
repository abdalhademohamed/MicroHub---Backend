import { ApiProperty } from '@nestjs/swagger';
import { IsDecimal, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateReceiptDto {
  @ApiProperty({ description: 'Order ID', example: 'order-id' })
  @IsUUID()
  orderId: string;

  

  @ApiProperty({ description: 'Message written on the receipt', example: 'Thank you for your purchase!' })
  @IsOptional()
  @IsString()
  message?: string;

 

  @ApiProperty({ description: 'Discount applied to the order', example: 10.00 })
  @IsDecimal()
  discount: number;

  @ApiProperty({ description: 'Remaining balance after the discount', example: 140.00 })
  @IsDecimal()
  remaining: number;



  @ApiProperty({ description: 'List of service IDs', example: ['service-id-1', 'service-id-2'] })
  @IsOptional()
  serviceIds?: string[];
}
