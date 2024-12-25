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
import { PaymentEntity } from "../payment/entities/payment.entity";
import { PositionEntity } from "../postion/entities/postion.entity";
import { OfferEntity } from "../offer/entities/offer.entity";
import { NotificationModule } from "../notification/notification.module";
import { SharableOfferEntity } from "../sharable-offer/entities/sharable-offer.entity";
import { ReservationModule } from "../reservation/reservation.module";
import { CustomerEntity } from "../customer/entities/customer.entity";
import { RootoshEntity } from "../rootosh/entities/rootosh.entity";
import { GiftCouponEntity } from "../gift-coupon/entities/gift-coupon.entity";
import { CustomI18nService } from "../common/custom.18n.service";
import { ActionModule } from "../action/action.module";
import { TransactionModule } from "src/transaction/transaction.module";

@Module({
  imports: [
    // TransactionModule,
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
      GiftCouponEntity,
    ]),
    NotificationModule,
    forwardRef(() => ReservationModule), // Use forwardRef for ReservationModule
    ActionModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, CloudinaryService,CustomI18nService],
  exports: [OrdersService],
})
export class OrdersModule {}