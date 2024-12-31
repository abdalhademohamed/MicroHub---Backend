import { forwardRef, Module } from "@nestjs/common";
import { ReservationService } from "./reservation.service";
import { ReservationController } from "./reservation.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReservationEntity } from "./entities/reservation.entity";
import { BranchEntity } from "../branch/entities/branch.entity";
import { ServiceEntity } from "../service/entities/service.entity";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { CustomerEntity } from "../customer/entities/customer.entity";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { PositionEntity } from "../postion/entities/postion.entity";
import { UserEntity } from "../user/entities/user.entity";
import { SlotsEntity } from "../slots/entities/slots.entity";
import { WorkingEntity } from "../slots/entities/working.entity";
import { OrdersService } from "../orders/orders.service";
import { OrderEntity } from "../orders/entities/order.entity";
import { PaymentEntity } from "../payment/entities/payment.entity";
import { OfferEntity } from "../offer/entities/offer.entity";
import { SharableOfferEntity } from "../sharable-offer/entities/sharable-offer.entity";
import { GiftCouponEntity } from "../gift-coupon/entities/gift-coupon.entity";
import { RootoshEntity } from "../rootosh/entities/rootosh.entity";
import { NotificationModule } from "../notification/notification.module";
import { CommentEntity } from "../comment/entities/comment.entity";
import { ReceiptEntity } from "../receipt/entities/receipt.entity";
import { CustomI18nService } from "../common/custom.18n.service";
import { ActionModule } from "../action/action.module";
import { TransactionModule } from "src/transaction/transaction.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReservationEntity,
      BranchEntity,
      ServiceEntity,
      CustomerEntity,
      EmployeeEntity,
      PositionEntity,
      UserEntity,
      WorkingEntity,
      SlotsEntity,
      OrderEntity,
      PaymentEntity,
      OfferEntity,
      SharableOfferEntity,
      GiftCouponEntity,
      RootoshEntity,
      CommentEntity,
      ReceiptEntity,
    ]),
    NotificationModule,
    ActionModule,
    TransactionModule,
  ],
  controllers: [ReservationController],
  providers: [
    ReservationService,
    OrdersService,
    CloudinaryService, // Add OrdersService here
    CustomI18nService,
  ],
  exports: [ReservationService], // Export ReservationService here
})
export class ReservationModule {}
