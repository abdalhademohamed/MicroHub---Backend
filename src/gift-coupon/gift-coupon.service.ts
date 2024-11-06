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
import { In } from 'typeorm';
import { OrderStatus } from "src/orders/utils/order.status.enum";

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
    private readonly orderRepository: Repository<OrderEntity>,
    private readonly i18n: CustomI18nService
  ) {}

  async createGiftCoupon(
    createGiftCouponDto: CreateGiftCouponDto
  ): Promise<GiftCouponEntity> {
    const { orderId, customerId } = createGiftCouponDto;

    try {
      const Order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      const sharableOffer = await this.sharableOfferRepository.findOne({
        where: { id: Order.sharableOfferId },
        relations: ["services"],
      });

      if (!sharableOffer) {
        throw new NotFoundException(
          this.i18n.translate("test.GIFT_COUPON.SHARABLE_OFFER_NOT_FOUND")
        );
      }

      const customer = await this.customerRepository.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException(
          this.i18n.translate("test.GIFT_COUPON.CUSTOMER_NOT_FOUND")
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

      const createdGiftCoupon =
        await this.giftCouponRepository.save(giftCoupon);
      Order.couponId = giftCoupon.id;
      await this.orderRepository.save(Order);
      return createdGiftCoupon;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        this.i18n.translate("test.GIFT_COUPON.CREATE_FAILED")
      );
    }
  }

  async getGiftCoupon(couponId: string): Promise<any> {
    const giftCoupon = await this.giftCouponRepository.findOne({
      where: { id: couponId },
      relations: [
        "ownedBy", 
        "sharableOffer", 
        "sharableOffer.services"
      ],
    });

    if (!giftCoupon) {
      throw new NotFoundException(
        this.i18n.translate("test.GIFT_COUPON.NOT_FOUND")
      );
    }

    const now = new Date();

    if (giftCoupon.isRedeemed) {
      throw new ConflictException(
        this.i18n.translate("test.GIFT_COUPON.ALREADY_REDEEMED")
      );
    }

    if (giftCoupon.endDateTime && giftCoupon.endDateTime < now) {
      throw new ConflictException(
        this.i18n.translate("test.GIFT_COUPON.EXPIRED")
      );
    }

    // Get all services from sharable offer
    const allServices = giftCoupon.sharableOffer.services;

    // Get remaining services from coupon
    const leftServices = giftCoupon.services || [];

    // Calculate used services by finding services that are in allServices but not in leftServices
    const usedServices = allServices.filter(
      (service) =>
        !leftServices.some((leftService) => leftService.id === service.id)
    );

    // Sort usage history by date
    const sortedUsageHistory = [...(giftCoupon.usageHistory || [])].sort(
      (a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime()
    );

    return {
      id: couponId,
      couponCode: giftCoupon.couponCode,
      isredeemed: giftCoupon.isRedeemed,
      redeemdAt: giftCoupon.redeemedAt,
      ownedBy: giftCoupon.ownedBy,
      allServices,
      leftServices,
      usedServices,
      totalServicesCount: allServices.length,
      remainingServicesCount: leftServices.length,
      usedServicesCount: usedServices.length,
      usageHistory: sortedUsageHistory,
    };
  }

  async getGiftCouponByCouponCode(couponCode: string): Promise<any> {
    const giftCoupon = await this.giftCouponRepository.findOne({
      where: { couponCode },
      relations: [
        "ownedBy", 
        "sharableOffer", 
        "sharableOffer.services"
      ],
    });

    if (!giftCoupon) {
      throw new NotFoundException(
        this.i18n.translate("test.GIFT_COUPON.NOT_FOUND")
      );
    }

    const now = new Date();

    if (giftCoupon.isRedeemed) {
      throw new ConflictException(
        this.i18n.translate("test.GIFT_COUPON.ALREADY_REDEEMED")
      );
    }

    if (giftCoupon.endDateTime && giftCoupon.endDateTime < now) {
      throw new ConflictException(
        this.i18n.translate("test.GIFT_COUPON.EXPIRED")
      );
    }

    // Get all services from sharable offer
    const allServices = giftCoupon.sharableOffer.services;

    // Get remaining services from coupon
    const leftServices = giftCoupon.services || [];

    // Calculate used services by finding services that are in allServices but not in leftServices
    const usedServices = allServices.filter(
      (service) =>
        !leftServices.some((leftService) => leftService.id === service.id)
    );

    // Sort usage history by date
    const sortedUsageHistory = [...(giftCoupon.usageHistory || [])].sort(
      (a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime()
    );

    return {
      id: giftCoupon.id,
      couponCode: giftCoupon.couponCode,
      isredeemed: giftCoupon.isRedeemed,
      redeemdAt: giftCoupon.redeemedAt,
      ownedBy: giftCoupon.ownedBy,
      allServices,
      leftServices,
      usedServices,
      totalServicesCount: allServices.length,
      remainingServicesCount: leftServices.length,
      usedServicesCount: usedServices.length,
      usageHistory: sortedUsageHistory,
    };
  }

  async updateGiftCouponServices(
    couponId: string,
    serviceIdsToRemove: string[]
  ): Promise<GiftCouponEntity> {
    const giftCoupon = await this.giftCouponRepository.findOne({
      where: { id: couponId },
      relations: ['sharableOffer', 'sharableOffer.services']
    });

    if (!giftCoupon) {
      throw new NotFoundException(
        this.i18n.translate("test.GIFT_COUPON.NOT_FOUND")
      );
    }

    const now = new Date();

    if (giftCoupon.isRedeemed) {
      throw new ConflictException(
        this.i18n.translate("test.GIFT_COUPON.CANNOT_UPDATE_REDEEMED")
      );
    }

    if (giftCoupon.endDateTime && giftCoupon.endDateTime < now) {
      throw new ConflictException(
        this.i18n.translate("test.GIFT_COUPON.EXPIRED")
      );
    }

    try {
      // Find the single order that used this coupon
      const order = await this.orderRepository.findOne({
        where: { 
          couponId: couponId,
        },
        relations: ['customer', 'reservation']
      });

      if (!order) {
        throw new NotFoundException('Order not found for this coupon');
      }

      // Update services list
      giftCoupon.services = giftCoupon.services.filter(
        (service) => !serviceIdsToRemove.includes(service.id)
      );

      // Get all used services details
      const usedServicesthatisremoved = serviceIdsToRemove.map(serviceId => {
        const service = giftCoupon.services.find(s => s.id === serviceId) || 
                       giftCoupon.sharableOffer.services.find(s => s.id === serviceId);
        
        if (!service) {
          throw new NotFoundException(`Service with ID ${serviceId} not found`);
        }

        return {
          id: service.id,
          arabic_Name: service.arabic_Name,
          english_Name: service.english_Name
        };
      });

      // Create usage history entry
      const usageHistoryEntry = {
        customer: {
          id: order.customer.id,
          name: order.customer.fullName,
          phoneNumber: order.customer.phoneNumber,
        },
        services: usedServicesthatisremoved,
        usedAt: order.reservation.start_Time || new Date()
      };

      // Update usage history
      if (!giftCoupon.usageHistory) {
        giftCoupon.usageHistory = [];
      }
      giftCoupon.usageHistory.push(usageHistoryEntry);

      // Update counters
      const servicesRemovedCount = serviceIdsToRemove.length;
      giftCoupon.usedServices += servicesRemovedCount;

      if (giftCoupon.usedServices >= giftCoupon.totalServices) {
        giftCoupon.isRedeemed = true;
        giftCoupon.redeemedAt = now;
        // giftCoupon.isReserved = true;
      }

      return await this.giftCouponRepository.save(giftCoupon);
    } catch (error) {
      console.error('Error updating gift coupon:', error);
      throw new InternalServerErrorException(
        this.i18n.translate("test.GIFT_COUPON.UPDATE_FAILED")
      );
    }
  }

  async getAllGiftCoupons(
    page: number = 1,
    limit: number = 10,
    fromDate?: string,
    toDate?: string
  ) {
    try {
      const take = Math.max(1, Number(limit));
      const skip = (Math.max(1, Number(page)) - 1) * take;

      // Build query with date filtering
      const queryBuilder = this.giftCouponRepository
        .createQueryBuilder("giftCoupon")
        .leftJoinAndSelect("giftCoupon.ownedBy", "ownedBy")
        .leftJoinAndSelect("giftCoupon.sharableOffer", "sharableOffer");

      // Add date range filtering if dates are provided
      if (fromDate) {
        const startOfDay = new Date(fromDate);
        startOfDay.setHours(0, 0, 0, 0);
        queryBuilder.andWhere("giftCoupon.createdAt >= :startDate", {
          startDate: startOfDay,
        });
      }

      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        queryBuilder.andWhere("giftCoupon.createdAt <= :endDate", {
          endDate: endOfDay,
        });
      }

      // Add pagination and ordering
      queryBuilder
        .orderBy("giftCoupon.createdAt", "DESC")
        .skip(skip)
        .take(take);

      const [coupons, total] = await queryBuilder.getManyAndCount();

      return {
        items: coupons,

        total,
        page: Math.max(1, Number(page)),
        limit: take,
        totalPages: Math.ceil(total / take),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        this.i18n.translate("test.GIFT_COUPON.FETCH_FAILED")
      );
    }
  }
}
