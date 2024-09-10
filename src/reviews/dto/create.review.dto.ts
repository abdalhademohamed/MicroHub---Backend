import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsString } from 'class-validator';

export class CreateReviewDto {
  

  @ApiProperty({ description: 'Rating for the newst review', example: 0 })
  @Min(1)
  @Max(5)
  newestReviews: number;


  @ApiProperty({ description: 'Employee ID to link the review', example: 'employee-id' })
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Order ID to link the review', example: 'order-id' })
  @IsString()
  orderId: string;
}
