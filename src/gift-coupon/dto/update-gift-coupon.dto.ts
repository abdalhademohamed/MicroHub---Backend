import { PartialType } from '@nestjs/swagger';
import { CreateGiftCouponDto } from './create-gift-coupon.dto';

export class UpdateGiftCouponDto extends PartialType(CreateGiftCouponDto) {}
