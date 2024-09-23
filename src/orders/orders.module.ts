<<<<<<< HEAD
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
import { AuditLogEntity } from '../audit-log/entities/audit.log.entity';
import { PaymentEntity } from '../payment/entities/payment.entity';
import { PositionEntity } from 'src/postion/entities/postion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, CommentEntity, ReservationEntity,EmployeeEntity,ReceiptEntity,UserEntity,PaymentEntity,PositionEntity]),
=======
import { Module } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { OrderEntity } from "./entities/order.entity";
import { CommentEntity } from "../comment/entities/comment.entity";
import { ReservationEntity } from "../reservation/entities/reservation.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { ReceiptEntity } from "../receipt/entities/receipt.entity";
import { UserEntity } from "../user/entities/user.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { PaymentEntity } from "../payment/entities/payment.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      CommentEntity,
      ReservationEntity,
      EmployeeEntity,
      ReceiptEntity,
      UserEntity,
      PaymentEntity,
    ]),
>>>>>>> bbfc03ec90e6938aca7a5731ab27823b36223600
  ],
  controllers: [OrdersController],
  providers: [OrdersService, CloudinaryService],
  exports: [OrdersService],
})
export class OrdersModule {}
