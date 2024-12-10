import { Module } from '@nestjs/common';
import { GiftCouponService } from './gift-coupon.service';
import { GiftCouponController } from './gift-coupon.controller';
import { SharableOfferEntity } from '../sharable-offer/entities/sharable-offer.entity';
import { CustomerEntity } from '../customer/entities/customer.entity';
import { GiftCouponEntity } from './entities/gift-coupon.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../orders/entities/order.entity';
import { CustomI18nService } from '../common/custom.18n.service';
import { ReceiptEntity } from '../receipt/entities/receipt.entity';
import { UserEntity } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GiftCouponEntity,
      SharableOfferEntity,
      CustomerEntity,
      OrderEntity,
      ReceiptEntity,
      UserEntity
    ]),
  ],
  controllers: [GiftCouponController],
  providers: [
    GiftCouponService,
    CustomI18nService,
  ],
  exports: [GiftCouponService],
})
export class GiftCouponModule {}
