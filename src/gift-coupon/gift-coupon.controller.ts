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
  Query,
} from "@nestjs/common";
import { GiftCouponService } from "./gift-coupon.service";
import { CreateGiftCouponDto } from "./dto/create-gift-coupon.dto";

import { GiftCouponEntity } from "./entities/gift-coupon.entity";
import { ApiTags, ApiQuery } from "@nestjs/swagger";
import { RolesGuard } from "../auth/guards/role.guards";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";
import { Roles } from "../auth/Roles.decorator";
import { Role } from "../user/utils/user.enum";

@ApiTags("gift-coupon")
@Controller("gift/coupon")
export class GiftCouponController {
  constructor(private readonly giftCouponService: GiftCouponService) {}

  // @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  @Post() // POST method for creating a new gift coupon
  async createGiftCoupon(
    @Request() req: any,

    @Body() createGiftCouponDto: CreateGiftCouponDto,
  ): Promise<GiftCouponEntity> {
    //   const userId = req.user.sub; // Hardcoded user ID for now

    // if (!userId) {
    //   throw new BadRequestException("User not authenticated");
    // }
    return this.giftCouponService.createGiftCoupon(createGiftCouponDto);
  }

  @Get("couponCode/:couponCode")
  async getGiftCouponByCouponCode(@Param("couponCode") couponId: string) {
    return await this.giftCouponService.getGiftCouponByCouponCode(couponId);
  }

  // @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  @Get(":couponId")
  async getGiftCoupon(@Param("couponId") couponId: string) {
    return await this.giftCouponService.getGiftCoupon(couponId);
  }

  // @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  //   @Roles(Role.ARTIST,Role.SUPERADMIN)
  //   @Patch('update/services/:couponId')
  //   async updateGiftCouponServices(
  //     @Param('couponId') couponId: string,
  //     @Body('serviceIds') serviceIdsToRemove: string[],
  //   ) {
  //     return this.giftCouponService.updateGiftCouponServices(couponId, serviceIdsToRemove);
  //   }

  // @UseGuards(AccessTokenGuard, RolesGuard)
  // @Roles(Role.SUPERADMIN)
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({
    name: "fromDate",
    required: false,
    type: String,
    description: "Format: YYYY-MM-DD",
  })
  @ApiQuery({
    name: "toDate",
    required: false,
    type: String,
    description: "Format: YYYY-MM-DD",
  })
  @Get()
  async getAllGiftCoupons(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    return await this.giftCouponService.getAllGiftCoupons(
      page,
      limit,
      fromDate,
      toDate,
    );
  }

  @Patch("cancel/:couponId")
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.BRANCHMANAGER)
  async cancelGiftCoupon(
    @Request() req: any,

    @Param("couponId") couponId: string,
  ) {
    const userId = req.user.sub;
    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return await this.giftCouponService.cancelGiftCoupon(couponId, userId);
  }
}
