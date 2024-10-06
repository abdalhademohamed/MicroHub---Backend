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
import { RolesGuard } from "../auth/guards/role.guards";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";
import { Roles } from "../auth/Roles.decorator";
import { Role } from "../user/utils/user.enum";

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

@UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.ARTIST)
  @Patch('update/services/:couponCode')
  async updateGiftCouponServices(
    @Param('couponCode') couponCode: string,
    @Body('serviceIds') serviceIdsToRemove: string[],
  ) {
    return this.giftCouponService.updateGiftCouponServices(couponCode, serviceIdsToRemove);
  }
}
