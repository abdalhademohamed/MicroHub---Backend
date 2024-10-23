import {
  ConflictException,
  Injectable,
  NotFoundException,
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
    private readonly OrderRepository: Repository<OrderEntity>
  ) {}

  async createGiftCoupon(
    createGiftCouponDto: CreateGiftCouponDto
  ): Promise<GiftCouponEntity> {
    const { orderId, customerId } = createGiftCouponDto;

    // Find the sharable offer and customer
    // Find the sharable offer with its services
    const Order = await this.OrderRepository.findOne({
      where: { id: orderId },
    });
    // Find the sharable offer with its services
    const sharableOffer = await this.sharableOfferRepository.findOne({
      where: { id: Order.sharableOfferId },
      relations: ["services"], // Load the related services
    });
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!sharableOffer) {
      throw new Error("Sharable offer not found");
    }

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Create a new gift coupon
    const giftCoupon = this.giftCouponRepository.create({
      sharableOffer,
      ownedBy: customer,
      totalServices: sharableOffer.services.length, // Set totalServices to the length of the services array
      services: sharableOffer.services, // Copy the services from the sharable offer
      couponCode: uuidv4(), // Generate a unique coupon code
      startDateTime: sharableOffer.startDateTime,
      endDateTime: sharableOffer.endDateTime,
    });

    const createdGiftCoupon= await this.giftCouponRepository.save(giftCoupon);
    Order.couponId=giftCoupon.id
    await this.OrderRepository.save(Order);
    return createdGiftCoupon


  }

  async getGiftCoupon(couponId: string): Promise<GiftCouponEntity> {
    // Find the gift coupon by coupon code
    const giftCoupon = await this.giftCouponRepository.findOne({
      where: { id:couponId },
    });

    // If the coupon is not found, throw a NotFoundException
    if (!giftCoupon) {
      throw new NotFoundException("Gift coupon not found");
    }
    const now = new Date();

    // Check if the coupon is redeemed
    if (giftCoupon.isRedeemed) {
      throw new ConflictException(
        "This coupon has already been redeemed and cannot be used."
      );
    }
    // // Check if the coupon is not valid yet (before the start date)
    // if (giftCoupon.startDateTime && giftCoupon.startDateTime > now) {
    //   throw new ConflictException(
    //     `This coupon is not valid until ${giftCoupon.startDateTime.toISOString()}`
    //   );
    // }

    // Check if the coupon is expired (after the end date)
    if (giftCoupon.endDateTime && giftCoupon.endDateTime < now) {
      throw new ConflictException(
        "This coupon has expired and cannot be used."
      );
    }

    // Return the coupon and its redeemed status
    return giftCoupon;
  }


  async getGiftCouponByCouponCode(couponCode: string): Promise<GiftCouponEntity> {
    // Find the gift coupon by coupon code
    const giftCoupon = await this.giftCouponRepository.findOne({
      where: {couponCode },
    });

    // If the coupon is not found, throw a NotFoundException
    if (!giftCoupon) {
      throw new NotFoundException("Gift coupon not found");
    }
    const now = new Date();

    // Check if the coupon is redeemed
    if (giftCoupon.isRedeemed) {
      throw new ConflictException(
        "This coupon has already been redeemed and cannot be used."
      );
    }
    // // Check if the coupon is not valid yet (before the start date)
    // if (giftCoupon.startDateTime && giftCoupon.startDateTime > now) {
    //   throw new ConflictException(
    //     `This coupon is not valid until ${giftCoupon.startDateTime.toISOString()}`
    //   );
    // }

    // Check if the coupon is expired (after the end date)
    if (giftCoupon.endDateTime && giftCoupon.endDateTime < now) {
      throw new ConflictException(
        "This coupon has expired and cannot be used."
      );
    }

    // Return the coupon and its redeemed status
    return giftCoupon;
  }
  // Method to update the gift coupon by removing specified services
  // Method to update the gift coupon by removing specified services
  async updateGiftCouponServices(
    couponId: string,
    serviceIdsToRemove: string[]
  ): Promise<GiftCouponEntity> {
    // Find the gift coupon by coupon code
    const giftCoupon = await this.giftCouponRepository.findOne({
      where: { id:couponId },
    });

    // If the coupon is not found, throw a NotFoundException
    if (!giftCoupon) {
      throw new NotFoundException("Gift coupon not found");
    }
    const now = new Date();

    // Check if the coupon has already been redeemed
    if (giftCoupon.isRedeemed) {
      throw new ConflictException(
        "This coupon has already been redeemed and cannot be updated."
      );
    }
    // // Check if the coupon is not valid yet (before the start date)
    // if (giftCoupon.startDateTime && giftCoupon.startDateTime > now) {
    //   throw new ConflictException(
    //     `This coupon is not valid until ${giftCoupon.startDateTime.toISOString()}`
    //   );
    // }

    // Check if the coupon is expired (after the end date)
    if (giftCoupon.endDateTime && giftCoupon.endDateTime < now) {
      throw new ConflictException(
        "This coupon has expired and cannot be used."
      );
    }
    // Filter the services, keeping only those not in the serviceIdsToRemove array
    giftCoupon.services = giftCoupon.services.filter(
      (service) => !serviceIdsToRemove.includes(service.id)
    );

    // Update the usedServices count based on the removed services
    const servicesRemovedCount = serviceIdsToRemove.length;
    giftCoupon.usedServices += servicesRemovedCount;

    // Check if usedServices equals totalServices and update isRedeemed if true
    if (giftCoupon.usedServices >= giftCoupon.totalServices) {
      giftCoupon.isRedeemed = true;
    }

    // Save the updated gift coupon
    return await this.giftCouponRepository.save(giftCoupon);
  }
}
