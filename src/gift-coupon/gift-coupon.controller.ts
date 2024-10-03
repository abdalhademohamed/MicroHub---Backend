import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Request,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { GiftCouponService } from "./gift-coupon.service";
import { CreateGiftCouponDto } from "./dto/create-gift-coupon.dto";

import { GiftCouponEntity } from "./entities/gift-coupon.entity";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('gift-coupon')
@Controller("gift/coupon")
export class GiftCouponController {
  constructor(private readonly giftCouponService: GiftCouponService) {}

  // @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  @Post() // POST method for creating a new gift coupon
  async createGiftCoupon(
    @Request() req: any,

    @Body() createGiftCouponDto: CreateGiftCouponDto
  ): Promise<GiftCouponEntity> {
    //   const userId = req.user.sub; // Hardcoded user ID for now

    // if (!userId) {
    //   throw new BadRequestException("User not authenticated");
    // }
    return this.giftCouponService.createGiftCoupon(createGiftCouponDto);
  }


// @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  @Get(':couponCode')
  async getGiftCoupon(@Param('couponCode') couponCode: string) {
    return await this.giftCouponService.getGiftCoupon(couponCode);
  }


  @Patch('update/services/:couponCode')
  async updateGiftCouponServices(
    @Param('couponCode') couponCode: string,
    @Body('serviceIds') serviceIdsToRemove: string[],
  ) {
    return this.giftCouponService.updateGiftCouponServices(couponCode, serviceIdsToRemove);
  }
}
