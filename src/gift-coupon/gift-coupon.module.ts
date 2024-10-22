import { Module } from '@nestjs/common';
import { GiftCouponService } from './gift-coupon.service';
import { GiftCouponController } from './gift-coupon.controller';
import { SharableOfferEntity } from '../sharable-offer/entities/sharable-offer.entity';
import { CustomerEntity } from '../customer/entities/customer.entity';
import { GiftCouponEntity } from './entities/gift-coupon.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../orders/entities/order.entity';

@Module({


  imports: [TypeOrmModule.forFeature([SharableOfferEntity,CustomerEntity,GiftCouponEntity,OrderEntity])],

  controllers: [GiftCouponController],
  providers: [GiftCouponService],
  exports: [GiftCouponService],  // Make sure to export GiftCouponService so it can be used in other modules

})
export class GiftCouponModule {}
