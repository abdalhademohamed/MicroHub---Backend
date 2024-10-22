import { Module } from '@nestjs/common';
import { SharableOfferService } from './sharable-offer.service';
import { SharableOfferController } from './sharable-offer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharableOfferEntity } from './entities/sharable-offer.entity';
import { ServiceEntity } from '../service/entities/service.entity';
import { BranchEntity } from '../branch/entities/branch.entity';
import { GiftCouponModule } from '../gift-coupon/gift-coupon.module';
import { UserEntity } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SharableOfferEntity,ServiceEntity,BranchEntity,UserEntity]),


  GiftCouponModule
],

  controllers: [SharableOfferController],
  providers: [SharableOfferService],
})
export class SharableOfferModule {}
