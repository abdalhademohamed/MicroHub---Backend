import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderEntity } from './entities/order.entity';
import { CommentEntity } from '../comment/entities/comment.entity';
import { ReservationEntity } from '../reservation/entities/reservation.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { EmployeeEntity } from '../employee/entities/employee.entity';
import { ReceiptEntity } from '../receipt/entities/receipt.entity';
import { UserEntity } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, CommentEntity, ReservationEntity,EmployeeEntity,ReceiptEntity,UserEntity]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService,CloudinaryService],
  exports: [OrdersService],
})
export class OrdersModule {}
