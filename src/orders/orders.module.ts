import { forwardRef, Module } from "@nestjs/common";
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
import { PositionEntity } from "../postion/entities/postion.entity";
import { OfferEntity } from "../offer/entities/offer.entity";
import { NotificationModule } from "../notification/notification.module";
import { NotificationEntity } from "../notification/entities/notification.entity";
import { SharableOfferEntity } from "../sharable-offer/entities/sharable-offer.entity";
import { GiftCouponModule } from "../gift-coupon/gift-coupon.module";
import { ReservationModule } from "../reservation/reservation.module";
import { CustomerEntity } from "../customer/entities/customer.entity";
import { RootoshEntity } from "../rootosh/entities/rootosh.entity";
import { GiftCouponEntity } from "../gift-coupon/entities/gift-coupon.entity";
@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      ReservationEntity,
      EmployeeEntity,
      ReceiptEntity,
      UserEntity,
      PaymentEntity,
      PositionEntity,
      OfferEntity,
      SharableOfferEntity,
      CustomerEntity,
      RootoshEntity,
      CommentEntity,
      GiftCouponEntity

    ]),
    NotificationModule,
    GiftCouponModule,
    forwardRef(() => ReservationModule), // Use forwardRef for ReservationModule
  ],
  controllers: [OrdersController],
  providers: [OrdersService, CloudinaryService],
  exports: [OrdersService],
})
export class OrdersModule {}