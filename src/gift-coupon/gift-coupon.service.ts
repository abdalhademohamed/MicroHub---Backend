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
import { In } from "typeorm";
import { OrderStatus } from "../orders/utils/order.status.enum";
import { ReceiptEntity } from "../receipt/entities/receipt.entity";
import { UserEntity } from "../user/entities/user.entity";

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
    private readonly i18n: CustomI18nService,
    @InjectRepository(ReceiptEntity)
    private readonly receiptRepository: Repository<ReceiptEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async createGiftCoupon(
    createGiftCouponDto: CreateGiftCouponDto,
  ): Promise<GiftCouponEntity> {
    const { orderId, customerId } = createGiftCouponDto;

    try {
      const Order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ["reservation", "reservation.services"], // Add these relations
      });

      const sharableOffer = await this.sharableOfferRepository.findOne({
        where: { id: Order.sharableOfferId },
        relations: ["services"],
      });

      if (!sharableOffer) {
        throw new NotFoundException(
          this.i18n.translate("test.GIFT_COUPON.SHARABLE_OFFER_NOT_FOUND"),
        );
      }

      const customer = await this.customerRepository.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException(
          this.i18n.translate("test.GIFT_COUPON.CUSTOMER_NOT_FOUND"),
        );
      }
      // Get the IDs of services in the order
      const orderServiceIds = Order.reservation.services.map(
        (service) => service.id,
      );

      // Filter out services that are in the order
      const services = sharableOffer.services.filter(
        (service) => !orderServiceIds.includes(service.id),
      );

      const giftCoupon = this.giftCouponRepository.create({
        sharableOffer,
        ownedBy: customer,
        totalServicesCount: services.length,
        services,
        Leftservices: services,
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
        this.i18n.translate("test.GIFT_COUPON.CREATE_FAILED"),
      );
    }
  }

  async getGiftCoupon(couponId: string): Promise<any> {
    const giftCoupon = await this.giftCouponRepository.findOne({
      where: { id: couponId },
      relations: ["ownedBy", "sharableOffer", "sharableOffer.services"],
    });

    if (!giftCoupon) {
      throw new NotFoundException(
        this.i18n.translate("test.GIFT_COUPON.NOT_FOUND"),
      );
    }

    const now = new Date();

    if (giftCoupon.isRedeemed) {
      throw new ConflictException(
        this.i18n.translate("test.GIFT_COUPON.ALREADY_REDEEMED"),
      );
    }

    if (giftCoupon.isCanceled) {
      throw new ConflictException(
        this.i18n.translate("test.GIFT_COUPON.ALREADY_CANCELED"),
      );
    }
    if (giftCoupon.endDateTime && giftCoupon.endDateTime < now) {
      throw new ConflictException(
        this.i18n.translate("test.GIFT_COUPON.EXPIRED"),
      );
    }

    // // Get all services from sharable offer
    // const allServices = giftCoupon.sharableOffer.services;

    // // Get remaining services from coupon
    // const leftServices = giftCoupon.services || [];

    // // Calculate used services by finding services that are in allServices but not in leftServices
    // const usedServices = allServices.filter(
    //   (service) =>
    //     !leftServices.some((leftService) => leftService.id === service.id)
    // );

    // // Sort usage history by date
    // const sortedUsageHistory = [...(giftCoupon.usageHistory || [])].sort(
    //   (a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime()
    // );

    return {
      id: giftCoupon.id,
      couponCode: giftCoupon.couponCode,
      isredeemed: giftCoupon.isRedeemed,
      redeemdAt: giftCoupon.redeemedAt,
      ownedBy: giftCoupon.ownedBy,
      services: giftCoupon.services,
      leftServices: giftCoupon.Leftservices, // Now only returns unreserved services
      usedServices: giftCoupon.Usedservices,
      totalServicesCount: giftCoupon.totalServicesCount,
      remainingServicesCount: giftCoupon.remainingServicesCount,
      usedServicesCount: giftCoupon.usedServicesCount,
      usageHistory: giftCoupon.usageHistory,
    };
  }

  async getGiftCouponByCouponCode(couponCode: string): Promise<any> {
    const giftCoupon = await this.giftCouponRepository.findOne({
      where: { couponCode },
      relations: ["ownedBy", "sharableOffer", "sharableOffer.services"],
    });

    if (!giftCoupon) {
      throw new NotFoundException(
        this.i18n.translate("test.GIFT_COUPON.NOT_FOUND"),
      );
    }

    const now = new Date();

    if (giftCoupon.isRedeemed) {
      throw new ConflictException(
        this.i18n.translate("test.GIFT_COUPON.ALREADY_REDEEMED"),
      );
    }
    if (giftCoupon.isCanceled) {
      throw new ConflictException(
        this.i18n.translate("test.GIFT_COUPON.ALREADY_CANCELED"),
      );
    }

    if (giftCoupon.endDateTime && giftCoupon.endDateTime < now) {
      throw new ConflictException(
        this.i18n.translate("test.GIFT_COUPON.EXPIRED"),
      );
    }

    // // Get all services from sharable offer
    // const allServices = giftCoupon.services;

    // // Get remaining services from coupon
    // const leftServices = giftCoupon.services || [];

    // // Filter out reserved services
    // const availableServices = leftServices.filter((service) => {
    //   const reservationStatus = giftCoupon.servicesReservationStatus?.find(
    //     (status) => status.serviceId === service.id
    //   );
    //   return !reservationStatus || !reservationStatus.isReserved;
    // });

    // // Calculate used services
    // const usedServices = allServices.filter(
    //   (service) =>
    //     !leftServices.some((leftService) => leftService.id === service.id)
    // );

    // // Sort usage history by date
    // const sortedUsageHistory = [...(giftCoupon.usageHistory || [])].sort(
    //   (a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime()
    // );

    // // Get reserved services
    // const reservedServices = leftServices.filter((service) => {
    //   const reservationStatus = giftCoupon.servicesReservationStatus?.find(
    //     (status) => status.serviceId === service.id
    //   );
    //   return reservationStatus && reservationStatus.isReserved;
    // });

    return {
      id: giftCoupon.id,
      couponCode: giftCoupon.couponCode,
      isredeemed: giftCoupon.isRedeemed,
      redeemdAt: giftCoupon.redeemedAt,
      ownedBy: giftCoupon.ownedBy,
      services: giftCoupon.services,
      leftServices: giftCoupon.Leftservices, // Now only returns unreserved services
      // reservedServices, // Add reserved services to response
      usedServices: giftCoupon.Usedservices,
      totalServicesCount: giftCoupon.totalServicesCount,
      remainingServicesCount: giftCoupon.remainingServicesCount,
      usedServicesCount: giftCoupon.usedServicesCount,
      usageHistory: giftCoupon.usageHistory,
    };
  }

  async updateGiftCouponServices(
    couponId: string,
    serviceIdsToRemove: string[],
  ): Promise<GiftCouponEntity> {
    const giftCoupon = await this.giftCouponRepository.findOne({
      where: { id: couponId },
      relations: ["sharableOffer", "sharableOffer.services"],
    });

    if (!giftCoupon) {
      throw new NotFoundException(
        this.i18n.translate("test.GIFT_COUPON.NOT_FOUND"),
      );
    }

    const now = new Date();

    if (giftCoupon.isRedeemed) {
      throw new ConflictException(
        this.i18n.translate("test.GIFT_COUPON.CANNOT_UPDATE_REDEEMED"),
      );
    }

    if (giftCoupon.endDateTime && giftCoupon.endDateTime < now) {
      throw new ConflictException(
        this.i18n.translate("test.GIFT_COUPON.EXPIRED"),
      );
    }

    try {
      // Find the single order that used this coupon
      const order = await this.orderRepository.findOne({
        where: {
          couponId: couponId,
        },
        relations: ["customer", "reservation"],
      });

      if (!order) {
        throw new NotFoundException("Order not found for this coupon");
      }

      // Initialize arrays if they don't exist
      if (!giftCoupon.Leftservices) {
        giftCoupon.Leftservices = [...giftCoupon.services];
      }
      if (!giftCoupon.Usedservices) {
        giftCoupon.Usedservices = [];
      }
      // Find services to be moved to used services
      const servicesToMove = giftCoupon.services.filter((service) =>
        serviceIdsToRemove.includes(service.id),
      );

      // Update Usedservices array - add newly used services
      giftCoupon.Usedservices = [...giftCoupon.Usedservices, ...servicesToMove];
      // Update Leftservices array - remove used services
      giftCoupon.Leftservices = giftCoupon.Leftservices.filter(
        (service) => !serviceIdsToRemove.includes(service.id),
      );

      // // Update services list
      // giftCoupon.services = giftCoupon.services.filter(
      //   (service) => !serviceIdsToRemove.includes(service.id)
      // );
      console.log(giftCoupon.services);
      console.log(serviceIdsToRemove.length);

      // Get all used services details
      const usedServicesthatisremoved = serviceIdsToRemove.map((serviceId) => {
        const service =
          giftCoupon.services.find((s) => s.id === serviceId) ||
          giftCoupon.sharableOffer.services.find((s) => s.id === serviceId);

        if (!service) {
          throw new NotFoundException(`Service with ID ${serviceId} not found`);
        }

        return {
          id: service.id,
          arabic_Name: service.arabic_Name,
          english_Name: service.english_Name,
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
        usedAt: order.reservation.start_Time || new Date(),
      };

      // Update usage history
      if (!giftCoupon.usageHistory) {
        giftCoupon.usageHistory = [];
      }
      giftCoupon.usageHistory.push(usageHistoryEntry);

      // Update counters
      const servicesRemovedCount = serviceIdsToRemove.length;
      giftCoupon.usedServicesCount += servicesRemovedCount;
      giftCoupon.remainingServicesCount -= servicesRemovedCount; // Update remaining count

      if (giftCoupon.usedServicesCount >= giftCoupon.totalServicesCount) {
        giftCoupon.isRedeemed = true;
        giftCoupon.redeemedAt = now;
        // giftCoupon.isReserved = true;
      }

      return await this.giftCouponRepository.save(giftCoupon);
    } catch (error) {
      console.error("Error updating gift coupon:", error);
      throw new InternalServerErrorException(
        this.i18n.translate("test.GIFT_COUPON.UPDATE_FAILED"),
      );
    }
  }

  async getAllGiftCoupons(
    page: number = 1,
    limit: number = 10,
    fromDate?: string,
    toDate?: string,
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
        this.i18n.translate("test.GIFT_COUPON.FETCH_FAILED"),
      );
    }
  }

  async cancelGiftCoupon(couponId: string, userId: string): Promise<any> {
    try {
      const giftCoupon = await this.giftCouponRepository.findOne({
        where: { id: couponId },
        relations: ["sharableOffer", "sharableOffer.services", "ownedBy"],
      });

      if (!giftCoupon) {
        throw new NotFoundException(
          this.i18n.translate("test.GIFT_COUPON.NOT_FOUND"),
        );
      }

      if (giftCoupon.isCanceled) {
        throw new ConflictException(
          this.i18n.translate("test.GIFT_COUPON.ALREADY_CANCELED"),
        );
      }

      if (giftCoupon.isRedeemed) {
        throw new ConflictException(
          this.i18n.translate("test.GIFT_COUPON.CANNOT_CANCEL_REDEEMED"),
        );
      }

      // Calculate refund details
      const sharableOfferServices = giftCoupon.sharableOffer.services;
      const unusedServices = giftCoupon.Leftservices || [];

      const refundDetails = unusedServices.map((unusedService) => {
        const originalService = sharableOfferServices.find(
          (service) => service.id === unusedService.id,
        );

        if (!originalService) {
          throw new NotFoundException(
            `Original service not found for ID: ${unusedService.id}`,
          );
        }

        const originalPrice = Number(originalService.price);
        const discountPercentage = Number(
          giftCoupon.sharableOffer.discountPercentage,
        );
        const discountMultiplier = 1 - discountPercentage / 100;
        const discountedPrice = Number(
          (originalPrice * discountMultiplier).toFixed(2),
        );

        return {
          serviceId: unusedService.id,
          serviceName: {
            arabic: unusedService.arabic_Name,
            english: unusedService.english_Name,
          },
          originalPrice: originalPrice,
          discountPercentage: discountPercentage,
          discountedPrice: discountedPrice,
          refundAmount: discountedPrice,
          duration: originalService.duration_Mins,
        };
      });

      const totalRefundAmount = Number(
        refundDetails
          .reduce((sum, service) => sum + service.refundAmount, 0)
          .toFixed(2),
      );

      // Create receipt
      const receipt = this.receiptRepository.create({
        totalPayment: -totalRefundAmount, // Negative amount to indicate refund
        remaining: 0,
        discount: giftCoupon.sharableOffer.discountPercentage,
        message: `Refund for canceled gift coupon: ${giftCoupon.couponCode}`,
        reservationTimeSlot: new Date().toISOString(),
        paymentForServices: refundDetails.map((service) => ({
          name: service.serviceName.english,
          duration: service.duration,
          price: service.refundAmount.toString(),
        })),
        createdBy: await this.userRepository.findOne({ where: { id: userId } }),
      });

      // Save receipt
      const savedReceipt = await this.receiptRepository.save(receipt);

      // Update coupon status
      giftCoupon.isCanceled = true;
      giftCoupon.canceledAt = new Date();
      giftCoupon.totalRefundAmount = totalRefundAmount;

      const updatedCoupon = await this.giftCouponRepository.save(giftCoupon);

      return {
        couponId: updatedCoupon.id,
        couponCode: updatedCoupon.couponCode,
        canceledAt: updatedCoupon.canceledAt,
        customer: {
          id: giftCoupon.ownedBy.id,
          name: giftCoupon.ownedBy.fullName,
          phoneNumber: giftCoupon.ownedBy.phoneNumber,
        },
        refundDetails: refundDetails,
        totalRefundAmount: totalRefundAmount,
        receipt: {
          id: savedReceipt.id,
          totalPayment: savedReceipt.totalPayment,
          generatedAt: savedReceipt.generatedAt,
          services: savedReceipt.paymentForServices,
        },
        status: "canceled",
      };
    } catch (error) {
      console.error("Error canceling gift coupon:", error);
      throw new InternalServerErrorException(
        this.i18n.translate("test.GIFT_COUPON.CANCEL_FAILED"),
      );
    }
  }
}
