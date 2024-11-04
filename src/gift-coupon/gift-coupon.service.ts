import {
  ConflictException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { CreateGiftCouponDto } from "./dto/create-gift-coupon.dto";
import { UpdateGiftCouponDto } from "./dto/update-gift-coupon.dto";
import { GiftCouponEntity } from "./entities/gift-coupon.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { SharableOfferEntity } from "../sharable-offer/entities/sharable-offer.entity";
import { Repository } from "typeorm";
import { CustomerEntity } from "../customer/entities/customer.entity";
import { v4 as uuidv4 } from "uuid";
import { OrderEntity } from "../orders/entities/order.entity";
import { CustomI18nService } from "../common/custom.18n.service";

@Injectable()
export class GiftCouponService {
  constructor(
    @InjectRepository(GiftCouponEntity)
    private readonly giftCouponRepository: Repository<GiftCouponEntity>,

    @InjectRepository(SharableOfferEntity)
    private readonly sharableOfferRepository: Repository<SharableOfferEntity>,

    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    @InjectRepository(OrderEntity)
    private readonly OrderRepository: Repository<OrderEntity>,
    private readonly i18n: CustomI18nService,
  ) {}

  async createGiftCoupon(
    createGiftCouponDto: CreateGiftCouponDto
  ): Promise<GiftCouponEntity> {
    const { orderId, customerId } = createGiftCouponDto;

    try {
      const Order = await this.OrderRepository.findOne({
        where: { id: orderId },
      });

      const sharableOffer = await this.sharableOfferRepository.findOne({
        where: { id: Order.sharableOfferId },
        relations: ["services"],
      });

      if (!sharableOffer) {
        throw new NotFoundException(
          this.i18n.translate('GIFT_COUPON.SHARABLE_OFFER_NOT_FOUND')
        );
      }

      const customer = await this.customerRepository.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException(
          this.i18n.translate('GIFT_COUPON.CUSTOMER_NOT_FOUND')
        );
      }

      const giftCoupon = this.giftCouponRepository.create({
        sharableOffer,
        ownedBy: customer,
        totalServices: sharableOffer.services.length,
        services: sharableOffer.services,
        couponCode: uuidv4(),
        startDateTime: sharableOffer.startDateTime,
        endDateTime: sharableOffer.endDateTime,
      });

      const createdGiftCoupon = await this.giftCouponRepository.save(giftCoupon);
      Order.couponId = giftCoupon.id;
      await this.OrderRepository.save(Order);
      return createdGiftCoupon;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        this.i18n.translate('GIFT_COUPON.CREATE_FAILED')
      );
    }
  }

  async getGiftCoupon(couponId: string): Promise<GiftCouponEntity> {
    const giftCoupon = await this.giftCouponRepository.findOne({
      where: { id: couponId },
    });

    if (!giftCoupon) {
      throw new NotFoundException(
        this.i18n.translate('GIFT_COUPON.NOT_FOUND')
      );
    }

    const now = new Date();

    if (giftCoupon.isRedeemed) {
      throw new ConflictException(
        this.i18n.translate('GIFT_COUPON.ALREADY_REDEEMED')
      );
    }

    if (giftCoupon.endDateTime && giftCoupon.endDateTime < now) {
      throw new ConflictException(
        this.i18n.translate('GIFT_COUPON.EXPIRED')
      );
    }

    return giftCoupon;
  }

  async getGiftCouponByCouponCode(couponCode: string): Promise<GiftCouponEntity> {
    const giftCoupon = await this.giftCouponRepository.findOne({
      where: { couponCode },
    });

    if (!giftCoupon) {
      throw new NotFoundException(
        this.i18n.translate('GIFT_COUPON.NOT_FOUND')
      );
    }

    const now = new Date();

    if (giftCoupon.isRedeemed) {
      throw new ConflictException(
        this.i18n.translate('GIFT_COUPON.ALREADY_REDEEMED')
      );
    }

    if (giftCoupon.endDateTime && giftCoupon.endDateTime < now) {
      throw new ConflictException(
        this.i18n.translate('GIFT_COUPON.EXPIRED')
      );
    }

    return giftCoupon;
  }

  async updateGiftCouponServices(couponId: string, serviceIdsToRemove: string[]): Promise<GiftCouponEntity> {
    const giftCoupon = await this.giftCouponRepository.findOne({
      where: { id: couponId },
    });

    if (!giftCoupon) {
      throw new NotFoundException(
        this.i18n.translate('GIFT_COUPON.NOT_FOUND')
      );
    }

    const now = new Date();

    if (giftCoupon.isRedeemed) {
      throw new ConflictException(
        this.i18n.translate('GIFT_COUPON.CANNOT_UPDATE_REDEEMED')
      );
    }

    if (giftCoupon.endDateTime && giftCoupon.endDateTime < now) {
      throw new ConflictException(
        this.i18n.translate('GIFT_COUPON.EXPIRED')
      );
    }

    try {
      giftCoupon.services = giftCoupon.services.filter(
        (service) => !serviceIdsToRemove.includes(service.id)
      );

      const servicesRemovedCount = serviceIdsToRemove.length;
      giftCoupon.usedServices += servicesRemovedCount;

      if (giftCoupon.usedServices >= giftCoupon.totalServices) {
        giftCoupon.isRedeemed = true;
      }

      return await this.giftCouponRepository.save(giftCoupon);
    } catch (error) {
      throw new InternalServerErrorException(
        this.i18n.translate('GIFT_COUPON.UPDATE_FAILED')
      );
    }
  }
}
