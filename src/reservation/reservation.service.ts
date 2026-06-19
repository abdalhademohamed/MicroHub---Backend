import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { DateTime } from 'luxon';
import { InjectEntityManager, InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";
import { ReservationEntity } from "./entities/reservation.entity";
import { BranchEntity } from "../branch/entities/branch.entity";
import { ServiceEntity } from "../service/entities/service.entity";
import { GetReservationsDto } from "./dto/get.reservation.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { CustomerEntity } from "../customer/entities/customer.entity";
import { CreateCustomerDto } from "../customer/dto/create.customer.dto";
import { CreateReservationDto } from "./dto/create.reservation.dto";
import { UpdateReservationDto } from "./dto/update.reservation.dto";
import { UpdateTimeReservationDto } from "./dto/update-time.reservation.dto";
import { WorkingEntity } from "../slots/entities/working.entity";
import { SlotsEntity } from "../slots/entities/slots.entity";
import { OrderEntity } from "../orders/entities/order.entity";
import { OrdersService } from "../orders/orders.service";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { UserEntity } from "../user/entities/user.entity";
import { OfferEntity } from "../offer/entities/offer.entity";
import { GetReservationsTimesDto } from "./dto/get.reservations.timings.dto";
import { SharableOfferEntity } from "../sharable-offer/entities/sharable-offer.entity";
import { GiftCouponEntity } from "../gift-coupon/entities/gift-coupon.entity";
import { RootoshEntity } from "../rootosh/entities/rootosh.entity";
import { CustomI18nService } from "../common/custom.18n.service";
import { UpdateBranchReservationDto } from "./dto/update-branch.reservation.dto";
import { ActionService } from "src/action/action.service";

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly ReservationRepository: Repository<ReservationEntity>,
    @InjectRepository(BranchEntity)
    private readonly BranchRepository: Repository<BranchEntity>,
    @InjectRepository(ServiceEntity)
    private readonly ServiceRepository: Repository<ServiceEntity>,
    private readonly CloudinaryService: CloudinaryService,
    @InjectRepository(CustomerEntity)
    private readonly CustomerRepository: Repository<CustomerEntity>,
    @InjectRepository(WorkingEntity)
    private readonly WorkingHourEntity: Repository<WorkingEntity>,
    @InjectRepository(SlotsEntity)
    private readonly SlotRepository: Repository<SlotsEntity>,
    private readonly OrdersService: OrdersService, // Inject the new service
    @InjectRepository(UserEntity)
    private UserRepository: Repository<UserEntity>,
    @InjectRepository(OfferEntity)
    private OfferRepository: Repository<OfferEntity>,
    @InjectEntityManager() private readonly entityManager: EntityManager,
    @InjectRepository(SharableOfferEntity)
    private SharableOfferRepository: Repository<SharableOfferEntity>,
    @InjectRepository(GiftCouponEntity)
    private GiftCouponRepository: Repository<GiftCouponEntity>,
    @InjectRepository(RootoshEntity)
    private RootoshRepository: Repository<RootoshEntity>,
    // @InjectRepository(EmployeeEntity)
    private readonly i18n: CustomI18nService,
    @InjectRepository(OrderEntity)
    private OrderRepo: Repository<OrderEntity>,
    private actionService: ActionService,
  ) {}
  
  splitIntervals(
    fromOriginal: Date,
    toOriginal: Date,
    fromUser: Date,
    toUser: Date,
  ) {
    const intervals = [];
    if (fromUser > fromOriginal) {
      intervals.push({ from: fromOriginal, to: fromUser });
    }
    if (toUser < toOriginal) {
      intervals.push({ from: toUser, to: toOriginal });
    }
    console.log(intervals);
    return intervals;
  }
  async selectBranch(branchId: string): Promise<BranchEntity> {
    // Find the branch by ID
    const branch = await this.BranchRepository.findOne({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException(
        this.i18n.translate("test.RESERVATION.BRANCH_NOT_FOUND"),
      );
    }

    return branch;
  }

  async registerOrLookupCustomer(
    createCustomerDto: CreateCustomerDto,
  ): Promise<CustomerEntity> {
    const { country_Code, phoneNumber, fullName, dateOfBirth } =
      createCustomerDto;

    // Check if customer exists by phone number
    let customer = await this.CustomerRepository.findOne({
      where: { phoneNumber },
      relations: ["lastServices", "lastRootoshes"], // Ensure relation names are correct
    });

    if (!customer) {
      // Register new customer
      customer = this.CustomerRepository.create({
        country_Code,
        phoneNumber,
        fullName,
        dateOfBirth, // Include dateOfBirth if applicable
      });

      await this.CustomerRepository.save(customer);
    }

    return customer;
  }

  async calculateTotalDuration(
    ids: string[],
  ): Promise<{ price: number; duration: number; services: ServiceEntity[] }> {
    const services = await this.ServiceRepository.findByIds(ids);

    if (services.length !== ids.length) {
      throw new HttpException(
        this.i18n.translate("test.RESERVATION.INVALID_SERVICE_IDS"),
        400,
      );
    }

    // Use array reduction to sum the price and duration
    const { price, duration } = services.reduce(
      (acc, service) => {
        acc.price += Number(service.price); // Ensure price is a number
        acc.duration += service.duration_Mins;
        return acc;
      },
      { price: 0, duration: 0 }, // Initial accumulator
    );

    return { price, duration, services };
  }

  async calculateRootoshTotalDuration(
    ids: string[],
  ): Promise<{ price: number; duration: number; rootosh: RootoshEntity[] }> {
    const rootosh = await this.RootoshRepository.findByIds(ids);

    if (rootosh.length !== ids.length) {
      throw new HttpException("Invalid Service IDs", 400);
    }

    // Use array reduction to sum the price and duration
    const { price, duration } = rootosh.reduce(
      (acc, service) => {
        acc.price = 0; // Ensure price is a number
        acc.duration += service.duration_Mins;
        return acc;
      },
      { price: 0, duration: 0 }, // Initial accumulator
    );

    return { price, duration, rootosh };
  }
  async getWorkingHoursAtSpecificDate(branchId: string, startTime: Date) {
    const workingHours = await this.WorkingHourEntity.createQueryBuilder("working")
      .leftJoinAndSelect("working.slot", "slot")
      .leftJoinAndSelect("slot.branch", "branch")
      .where("branch.id = :branchId", { branchId })
      .andWhere("working.from <= :startTime", { startTime })
      .andWhere("working.to > :startTime", { startTime })
      .getMany();

    return workingHours;
}
  newAddedWorkingHours(
    body: {
      fromUser: Date;
      toUser: Date;
      fromOriginal: Date;
      toOriginal: Date;
    },
    slot: SlotsEntity,
  ) {
    const Intervals = this.splitIntervals(
      body.fromOriginal,
      body.toOriginal,
      body.fromUser,
      body.toUser,
    );
    const newWorkingHours = [];
    for (const { from, to } of Intervals) {
      const duration = Math.floor(
        (to.getTime() - from.getTime()) / (1000 * 60),
      );
      const new_working = this.WorkingHourEntity.create({
        from,
        to,
        slot,
        duration,
      });
      newWorkingHours.push(new_working);
    }
    return newWorkingHours;
  }
  async getBranchSlot(branchId: string, date: Date) {
    const slot = await this.SlotRepository.findOne({
      where: {
        day: date.getUTCDate(),
        month: date.getUTCMonth() + 1,
        year: date.getUTCFullYear(),
        branch: {
          id: branchId,
        },
      },
    });
    if (!slot) {
      throw new NotFoundException(
        this.i18n.translate("test.RESERVATION.SLOT_NOT_FOUND"),
      );
    }
    return slot;
  }

  async createReservation(
    body: CreateReservationDto,
    image: Express.Multer.File,
    userId: string,
  ) {
    try {
      // Validate branch existence
      const branch = await this.BranchRepository.findOne({
        where: { id: body.branch },
      });
      if (!branch) {
        throw new NotFoundException(
          this.i18n.translate("test.RESERVATION.BRANCH_NOT_FOUND"),
        );
      }

      console.log('branch is', branch);

      let serviceIds: string[] = [];
      let services: ServiceEntity[] = [];
      let rootoshIds: string[] = []; // Initialize rootoshIds array
      let rootoshes: RootoshEntity[] = []; // Initialize rootoshes array
      // Initialize duration and price variables
      let duration = 0;
      let price = 0;
      let result;
      // Check if at least one of services, offerId, sharableOfferId, or couponCode is provided
      if (!body.services || body.services.length === 0) {
        if (
          !body.offerId &&
          !body.sharableOfferId &&
          !body.couponCode &&
          !body.rootosh
        ) {
          throw new BadRequestException(
            "At least one of services, offerId, rootosh , sharableOfferId, or couponCode must be provided",
          );
        }
      }

      // Check if services are provided
      if (body.services && body.services.length > 0) {
        serviceIds = body.services;

        // Fetch services based on provided IDs
        services = await this.ServiceRepository.find({
          where: { id: In(serviceIds) },
        });
        if (services.length !== serviceIds.length) {
          throw new BadRequestException("Some services were not found");
        }
      }

      // Check if offerId is provided
      if (body.offerId) {
        const offer = await this.OfferRepository.findOne({
          where: { id: body.offerId },
          relations: ["services"],
        });
        if (!offer) {
          throw new NotFoundException("Offer not found");
        }
        console.log(offer);
        serviceIds = offer.services.map((service) => service.id); // Extract service IDs from the offer
        services = offer.services; // Use services from the offer

        const serviceTotals = await this.calculateTotalDuration(serviceIds);
        duration += serviceTotals.duration;
        price += serviceTotals.price;

        console.log((Number(offer.discountPercentage) / 100) * price);

        price = Math.floor(price - ((Number(offer.discountPercentage) / 100) * price));

        // Ensure image is provided
        if (image) {
          const folderName = "reservation";
          result = await this.CloudinaryService.uploadImage(image, folderName);
          body.deposit_Content = result.url;
        }

        // Upload image to Cloudinary
      }

      console.log('offer id is', body.offerId);

      // Check for sharable offer and add its services if applicable
      if (body.sharableOfferId && body.services && body.services.length > 0) {
        serviceIds = body.services;

        const sharableOffer = await this.SharableOfferRepository.findOne({
          where: { id: body.sharableOfferId },
          relations: ["services"],
        });
        if (!sharableOffer) {
          throw new NotFoundException("Sharable offer not found");
        }
        // Validate selected services are part of the offer
        const offerServiceIds = sharableOffer.services.map((s) => s.id);
        const invalidServices = body.services.filter(
          (id) => !offerServiceIds.includes(id),
        );
        if (invalidServices.length > 0) {
          throw new BadRequestException(
            this.i18n.translate("test.RESERVATION.INVALID_OFFER_SERVICES"),
          );
        }

        const serviceTotals = await this.calculateTotalDuration(serviceIds);

        const fullServiceIds = sharableOffer.services.map(
          (service) => service.id,
        ); // Extract service IDs from the sharable offer
        const fullServiceTotals =
          await this.calculateTotalDuration(fullServiceIds);

        duration += serviceTotals.duration;
        price += fullServiceTotals.price;

        price =
          Math.floor(price - ((Number(sharableOffer.discountPercentage) / 100) * price));

        console.log(price);
        // Ensure image is provided
        if (image) {
          const folderName = "reservation";
          result = await this.CloudinaryService.uploadImage(image, folderName);
          body.deposit_Content = result.url;
        }

        // Upload image to Cloudinary
      }

      console.log('coupon id is', body.couponCode);

      // Check for coupon code and add its services if applicable
      if (body.couponCode && body.services && body.services.length > 0) {
        serviceIds = body.services;
        const coupon = await this.GiftCouponRepository.findOne({
          where: { couponCode: body.couponCode },
        });

        if (!coupon) {
          throw new NotFoundException("Coupon code not found");
        }

        // Check if the coupon is already redeemed
        if (coupon.isRedeemed) {
          throw new ConflictException("Coupon has already been redeemed");
        }
        const transformedServices: ServiceEntity[] = coupon.services
          .filter((service) => body.services.includes(service.id)) // Only include services requested in body
          .map((service) => this.mapCouponServiceToServiceEntity(service));

        services = transformedServices;
        body.deposit = 0;
        price = 0;
        body.deposit_Content = null;
        const serviceTotals = await this.calculateTotalDuration(serviceIds);
        duration += serviceTotals.duration;
      }

      // Check if rootoshIds are provided
      if (body.rootosh && body.rootosh.length > 0) {
        rootoshIds = body.rootosh;

        // Fetch rootosh entities based on provided IDs
        rootoshes = await this.RootoshRepository.find({
          where: { id: In(rootoshIds) },
        });
        if (rootoshes.length !== rootoshIds.length) {
          throw new BadRequestException("Some rootosh IDs were not found");
        }

        const rootoshTotals =
          await this.calculateRootoshTotalDuration(rootoshIds);

        duration += rootoshTotals.duration;
        price += rootoshTotals.price;
        body.deposit = 0;
        body.deposit_Content = null;
      }

      if (
        body.services &&
        body.services.length > 0 &&
        !body.offerId &&
        !body.sharableOfferId &&
        !body.couponCode &&
        !body.rootosh
      ) {
        // Ensure image is provided
        if (image) {
          const folderName = "reservation";
          result = await this.CloudinaryService.uploadImage(image, folderName);
          body.deposit_Content = result.url;
        }
        const serviceTotals = await this.calculateTotalDuration(serviceIds);
        duration += serviceTotals.duration;
        price += serviceTotals.price;

        // Upload image to Cloudinar
      }

      // Handle custom time
      const startTime = new Date(body.customStartTime);

      const endTime = new Date(startTime.getTime() + duration * 1000 * 60);

      const workingDate = startTime;

      // Get working hours for the branch on the specific date
      const workingHours = await this.getWorkingHoursAtSpecificDate(
        body.branch,
        workingDate,
      );

      console.log(workingHours);

      // Check if the working hours allow the reservation
      const index = workingHours.findIndex(
        (w) => w.from <= startTime && w.to >= endTime,
      );

      console.log(index);

      if (index === -1) {
        throw new BadRequestException(
          this.i18n.translate("test.RESERVATION.SCHEDULE_CONFLICT"),
        );
      }

      // Validate customer existence
      const customer = await this.CustomerRepository.findOneBy({
        phoneNumber: body.phone_Number,
      });
      if (!customer) {
        throw new BadRequestException(
          this.i18n.translate("test.RESERVATION.CUSTOMER_NOT_FOUND"),
        );
      }
      if (body.deposit && body.deposit > Math.ceil(price)) {
        throw new BadRequestException(
          "The deposit can't be more than the total price",
        );
      }
      // Validate employee existence
      const employee = await this.UserRepository.findOne({
        where: { id: userId },
      });
      if (!employee) {
        throw new NotFoundException("Employee not found");
      }
      // Create and save reservation
      const reservation = this.ReservationRepository.create({
        customer,
        totalPrice: Math.ceil(price),
        deposit: body.deposit,
        start_Time: startTime,
        end_Time: endTime,
        reservationDay: workingHours[index].slot.day,
        reservationMonth: workingHours[index].slot.month,
        reservationYear: workingHours[index].slot.year,
        branch,
        deposit_Content: body.deposit_Content,
        services,
        rootoshes,
        createdBy: userId,
      });

      console.log('reservation is', reservation);

      console.log(
        workingHours[index].slot.day,
        workingHours[index].slot.month,
        workingHours[index].slot.year,
      );
      await this.ReservationRepository.save(reservation);

      if (body.rootosh) {
        const orderId = await this.OrdersService.createOrderForRootosh(
          reservation.id,
          userId,
          body.paymentId,
        );

        if (!orderId) {
          throw new InternalServerErrorException(
            "Failed to create order for rootosh.",
          );
        }
      } else {
        const orderId = await this.OrdersService.createOrder(
          reservation.id,
          userId,
          body.paymentId,
          body.offerId,
          body.sharableOfferId,
          body.couponCode,
        );
        if (!orderId) {
          throw new InternalServerErrorException("Failed to create order.");
        }
      }

      // Adjust working hours based on the new reservation
      const newWorkingHours = this.newAddedWorkingHours(
        {
          fromOriginal: workingHours[index].from,
          toOriginal: workingHours[index].to,
          fromUser: startTime,
          toUser: endTime,
        },
        workingHours[index].slot,
      );

      await this.WorkingHourEntity.save(newWorkingHours);
      await this.WorkingHourEntity.delete({ id: workingHours[index].id });

      // Create an audit log for the reservation creation
      const log = new AuditLogEntity();
      log.tableName = "reservation";
      log.action = "INSERT";
      log.entityId = reservation.id;
      log.performedBy = userId;

      const user = await this.UserRepository.findOne({
        where: { id: userId },
        select: ["id", "username", "email", "role"],
      });

      if (user) {
        log.userDetails = user;
      }

      await this.entityManager.save(AuditLogEntity, log);
      if (body.couponCode && body.services && body.services.length > 0) {
        const coupon = await this.GiftCouponRepository.findOne({
          where: { couponCode: body.couponCode },
        });
        //  After reservation is created successfully, update the gift coupon
        try {
          await this.updateGiftCouponServices(
            coupon.id,
            body.services, // serviceIdsToRemove are the services being used in this reservation
          );
        } catch (error) {
          // If updating gift coupon fails, we should rollback the reservation
          if (reservation) {
            await this.ReservationRepository.remove(reservation);
          }
          throw new InternalServerErrorException(
            "Failed to update gift coupon services",
          );
        }
      }
      return { reservation };
    } catch (error) {
      console.log(error);
      if (error instanceof NotFoundException) {
        throw new NotFoundException({
          message: error.message,
          category: "EntityNotFound", // Custom error category
        });
      } else if (error instanceof BadRequestException) {
        throw new BadRequestException({
          message: error.message,
          category: "ValidationError", // Custom error category
        });
      } else if (error instanceof ConflictException) {
        throw new ConflictException({
          message: error.message,
          category: "ConflictError", // Custom error category
        });
      } else {
        console.log(error);
        throw new InternalServerErrorException({
          message: error.message || "Unexpected error occurred",
          category: "InternalServerError", // Custom error category for unexpected errors
        });
      }
    }
  }

  private async updateGiftCouponServices(
    couponId: string,
    serviceIdsToRemove: string[],
  ): Promise<GiftCouponEntity> {
    const giftCoupon = await this.GiftCouponRepository.findOne({
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
      const order = await this.OrderRepo.findOne({
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

      return await this.GiftCouponRepository.save(giftCoupon);
    } catch (error) {
      console.error("Error updating gift coupon:", error);
      throw new InternalServerErrorException(
        this.i18n.translate("test.GIFT_COUPON.UPDATE_FAILED"),
      );
    }
  }
  private mapCouponServiceToServiceEntity(couponService: any): ServiceEntity {
    const serviceEntity = new ServiceEntity();
    serviceEntity.id = couponService.id; // or whatever mapping is needed
    serviceEntity.price = couponService.price;
    serviceEntity.imageUrl = couponService.imageUrl;
    serviceEntity.arabic_Name = couponService.arabic_Name;
    serviceEntity.english_Name = couponService.english_Name;
    serviceEntity.duration_Mins = couponService.duration_Mins;
    serviceEntity.rootosh_Number = couponService.rootosh_Number;
    serviceEntity.months_To_Expire = couponService.months_To_Expire;

    // Map any additional required properties if necessary

    return serviceEntity;
  }

  getLocalTime(day: number, month: number, year: number, timezone: string) {
    // Create the date in the specified timezone
    console.log('day month year logs', day , month, year);
    const startOfDayLocal = DateTime.fromObject(
        { year, month, day, hour: 0, minute: 0, second: 0 },
        { zone: timezone }
    );

    const endOfDayLocal = startOfDayLocal.set({ hour: 23, minute: 59, second: 59 });

    // Convert to UTC in ISO format (best for databases)
    const startOfDayUTC = startOfDayLocal.toUTC().toISO(); // "2025-03-06T00:00:00.000Z"
    const endOfDayUTC = endOfDayLocal.toUTC().toISO(); // "2025-03-06T23:59:59.999Z"

    console.log(startOfDayUTC, endOfDayUTC);
    return { startOfDayUTC, endOfDayUTC };
  }


  async getAllReservations(
    getReservationsDto: GetReservationsDto,
    timezone: string,
    branchId?: string,
  ): Promise<{
    items: ReservationEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { day, month, year, page = 1, limit = 10 } = getReservationsDto;

    const query = this.ReservationRepository.createQueryBuilder("reservation")
      .leftJoinAndSelect("reservation.branch", "branch")
      .leftJoinAndSelect("reservation.services", "services")
      .leftJoinAndSelect("reservation.customer", "customer");

    if(day && month && year){
      const { startOfDayUTC, endOfDayUTC } = this.getLocalTime(day, month, year, timezone);
      query.andWhere("reservation.start_Time >= :fromDate", {
        fromDate: startOfDayUTC,
      });
      query.andWhere("reservation.start_Time <= :fromDate", {
        fromDate: endOfDayUTC,
      });
    }

    // Optional branchId filter
    if (branchId) {
      query.andWhere("branch.id = :branchId", { branchId });
    }

    // Apply pagination
    query.skip((page - 1) * limit).take(limit);

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async getBookingBranch(branchId: string, query: GetReservationsDto, timezone: string) {
    const { day, month, year, page = 1, limit = 10 } = query;

    const reservationQuery = this.ReservationRepository.createQueryBuilder(
      "reservation",
    )
      .select([
        "reservation.id",
        "reservation.start_Time",
        "reservation.end_Time",
      ])
      .innerJoin("reservation.branch", "branch")
      .where("branch.id = :branchId", { branchId });

      if(day && month && year){
        const { startOfDayUTC, endOfDayUTC } = this.getLocalTime(day, month, year, timezone);
        reservationQuery.andWhere("reservation.start_Time >= :fromDate", {
          fromDate: startOfDayUTC,
        });
        reservationQuery.andWhere("reservation.start_Time <= :fromDate", {
          fromDate: endOfDayUTC,
        });
      }

    reservationQuery.skip((page - 1) * limit).take(limit);

    const [items, total] = await reservationQuery.getManyAndCount();

    return { items, page, total };
  }

  async updateReservationServices(
    id: string,
    body: UpdateReservationDto,
    userId: string,
  ) {
    const reservation = await this.ReservationRepository.findOne({
      where: { id },
      relations: {
        branch: true,
        services: true, // Ensure related services are included
      },
    });

    if (!reservation) {
      throw new NotFoundException(
        this.i18n.translate("test.RESERVATION.NOT_FOUND", { args: { id } }),
      );
    }

    const { duration, services, price } = await this.calculateTotalDuration(
      body.services,
    );
    const startTime = new Date(body.startTime);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const workingDate = startTime;

    const workingHours = await this.getWorkingHoursAtSpecificDate(
      reservation.branch.id,
      workingDate,
    );

    const index = workingHours.findIndex(
      (w) => w.from <= startTime && w.to >= endTime,
    );

    if (index === -1) {
      throw new BadRequestException(
        this.i18n.translate("test.RESERVATION.SCHEDULE_CONFLICT"),
      );
    }

    const newWorkingHours = this.newAddedWorkingHours(
      {
        fromOriginal: workingHours[index].from,
        toOriginal: workingHours[index].to,
        fromUser: startTime,
        toUser: endTime,
      },
      workingHours[index].slot,
    );

    await this.cancelReservationAndAddSlot(
      reservation.reservationDay,
      reservation.reservationMonth,
      reservation.reservationYear,
      reservation.start_Time,
      reservation.end_Time,
      reservation.branch.id,
    );

    await this.WorkingHourEntity.save(newWorkingHours);
    await this.WorkingHourEntity.delete({ id: workingHours[index].id });

    // Log the changes before saving the updated reservation
    const oldReservation = { ...reservation }; // Clone the old reservation for comparison
    reservation.start_Time = startTime;
    reservation.end_Time = endTime;
    reservation.services = services;
    reservation.totalPrice = price;
    reservation.reservationDay = workingHours[index].slot.day;
    reservation.reservationMonth = workingHours[index].slot.month;
    reservation.reservationYear = workingHours[index].slot.year;

    await this.ReservationRepository.save(reservation);

    // // Create a new order for the updated reservation
    // await this.OrdersService.createOrder(reservation.id, userId,body.paymentId);
    // Call to update the associated order with the updated services
    const updatedOrder =
      await this.OrdersService.updateOrderServicesFromReservation(
        reservation.id,
        userId,
      );
    // Create an audit log entry for the updated reservation
    const changedColumns = ["start_Time", "end_Time", "services", "totalPrice"];
    const changesDetails = {};

    changedColumns.forEach((column) => {
      changesDetails[column] = {
        oldValue: oldReservation[column],
        newValue: reservation[column],
      };
    });

    const log = new AuditLogEntity();
    log.tableName = "reservation";
    log.action = "UPDATE";
    log.entityId = reservation.id;
    log.changedColumns = changedColumns;
    log.changesDetails = changesDetails;
    log.performedBy = userId;

    const user = await this.UserRepository.findOne({
      where: { id: userId },
      select: ["id", "username", "email", "role"],
    });
    if (user) {
      log.userDetails = user;
    }

    await this.entityManager.save(AuditLogEntity, log);

    return { status: "Reservation updated", updatedOrder };
  }

  async updateTime(id: string, body: UpdateTimeReservationDto, userId: string) {
    // try {
    const reservation = await this.ReservationRepository.findOne({
      where: { id },
      relations: {
        branch: true,
        services: true,
      },
    });
    const oldReservation = { ...reservation }; // Clone the old reservation for comparison

    if (!reservation) {
      throw new NotFoundException(
        this.i18n.translate("test.RESERVATION.NOT_FOUND", { args: { id } }),
      );
    }
    console.log(oldReservation, "111111111111111111111111111111");
    const duration =
      (oldReservation.end_Time.getTime() -
        oldReservation.start_Time.getTime()) /
      (1000 * 60);
    const startTime = new Date(body.startTime);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const workingDate = startTime;

    const workingHours = await this.getWorkingHoursAtSpecificDate(
      reservation.branch.id,
      workingDate,
    );

    const index = workingHours.findIndex(
      (w) => w.from <= startTime && w.to >= endTime,
    );

    if (index === -1) {
      throw new BadRequestException(
        this.i18n.translate("test.RESERVATION.SCHEDULE_CONFLICT"),
      );
    }

    reservation.start_Time = startTime;
    reservation.end_Time = endTime;
    reservation.reservationDay = workingHours[index].slot.day;
    reservation.reservationMonth = workingHours[index].slot.month;
    reservation.reservationYear = workingHours[index].slot.year;

    await this.ReservationRepository.save(reservation);
    const newWorkingHours = this.newAddedWorkingHours(
      {
        fromOriginal: workingHours[index].from,
        toOriginal: workingHours[index].to,
        fromUser: startTime,
        toUser: endTime,
      },
      workingHours[index].slot,
    );

    await this.WorkingHourEntity.save(newWorkingHours);
    await this.WorkingHourEntity.delete({ id: workingHours[index].id });

    await this.cancelReservationAndAddSlot(
      reservation.reservationDay,
      reservation.reservationMonth,
      reservation.reservationYear,
      oldReservation.start_Time,
      oldReservation.end_Time,
      oldReservation.branch.id,
    );
    console.log("beforeReservation order updated", reservation);
    const updatedOrder =
      await this.OrdersService.updateOrderTimeFromReservation(
        reservation.id,
        userId,
      );
    console.log("afterReservation order updated", updatedOrder);
    return updatedOrder;
  }

  async updateTimeforRootosh(
    id: string,
    body: UpdateTimeReservationDto,
    userId: string,
  ) {
    try {
      const reservation = await this.ReservationRepository.findOne({
        where: { id },
        relations: {
          branch: true,
          rootoshes: true,
        },
      });
      const oldReservation = { ...reservation }; // Clone the old reservation for comparison

      if (!reservation) {
        throw new NotFoundException(`Reservation with ID ${id} not found`);
      }
      const acc = { price: 0, duration: 0 };
      for (const rootosh of reservation.rootoshes) {
        acc.price += 0;
        acc.duration += rootosh.duration_Mins;
      }
      const startTime = new Date(body.startTime);
      const endTime = new Date(startTime.getTime() + acc.duration * 60 * 1000);

      const workingDate = startTime;

      const workingHours = await this.getWorkingHoursAtSpecificDate(
        reservation.branch.id,
        workingDate,
      );

      const index = workingHours.findIndex(
        (w) => w.from <= startTime && w.to >= endTime,
      );
      if (index === -1) {
        throw new BadRequestException(
          "The custom schedule conflicts with an existing reservation.",
        );
      }

      // Update the reservation with new times
      reservation.start_Time = startTime;
      reservation.end_Time = endTime;
      reservation.reservationDay = workingHours[index].slot.day;
      reservation.reservationMonth = workingHours[index].slot.month;
      reservation.reservationYear = workingHours[index].slot.year;

      await this.ReservationRepository.save(reservation);
      const newWorkingHours = this.newAddedWorkingHours(
        {
          fromOriginal: workingHours[index].from,
          toOriginal: workingHours[index].to,
          fromUser: startTime,
          toUser: endTime,
        },
        workingHours[index].slot,
      );

      await this.WorkingHourEntity.save(newWorkingHours);
      await this.WorkingHourEntity.delete({ id: workingHours[index].id });

      await this.cancelReservationAndAddSlot(
        reservation.reservationDay,
        reservation.reservationMonth,
        reservation.reservationYear,
        oldReservation.start_Time,
        oldReservation.end_Time,
        oldReservation.branch.id,
      );

      // Log the changes before updating the reservation

      const updatedOrder =
        await this.OrdersService.updateOrderTimeFromReservation(
          reservation.id,
          userId,
        );

      // Create an audit log entry
      const changedColumns = ["start_Time", "end_Time"];
      const changesDetails = {};

      changedColumns.forEach((column) => {
        changesDetails[column] = {
          oldValue: oldReservation[column],
          newValue: reservation[column],
        };
      });

      const log = new AuditLogEntity();
      log.tableName = "reservation";
      log.action = "UPDATE";
      log.entityId = reservation.id;
      log.changedColumns = changedColumns;
      log.changesDetails = changesDetails;
      log.performedBy = userId;

      const user = await this.UserRepository.findOne({
        where: { id: userId },
        select: ["id", "username", "email", "role"],
      });
      if (user) {
        log.userDetails = user;
      }

      await this.entityManager.save(AuditLogEntity, log);

      return { status: "Time updated", updatedOrder };
    } catch (error) {
      // Categorize and log errors
      if (error instanceof NotFoundException) {
        // Log specific error for not found exception
        console.error(`Error: ${error.message}`, { error });
        throw error; // Re-throw to preserve the original exception
      } else if (error instanceof BadRequestException) {
        // Log specific error for bad request exception
        console.error(`Error: ${error.message}`, { error });
        throw error; // Re-throw to preserve the original exception
      } else {
        // Log unexpected errors
        console.error("An unexpected error occurred during updateTime:", {
          error,
          id,
          userId,
          body,
        });
        throw new InternalServerErrorException(
          "An error occurred while updating the reservation.",
        );
      }
    }
  }
  async deleteReservation(id: string) {
    const reservation = await this.ReservationRepository.findOne({
      where: { id, isDeleted: false },
      relations: {
        branch: true,
      },
    });
    if (!reservation) {
      throw new NotFoundException(
        this.i18n.translate("test.RESERVATION.NOT_FOUND", { args: { id } }),
      );
    }
    reservation.isDeleted = true;
    // Delete the reservation
    await this.ReservationRepository.save(reservation);
    if (reservation.start_Time <= new Date()) {
      return { status: "deleted" };
    }
    await this.cancelReservationAndAddSlot(
      reservation.reservationDay,
      reservation.reservationMonth,
      reservation.reservationYear,
      reservation.start_Time,
      reservation.end_Time,
      reservation.branch.id,
    );
    return { status: "deleted" };
  }
  async updateReservationBranch(
    reservationId: string,
    body: UpdateBranchReservationDto,
    userId: string,
  ) {
    try {
      const reservation = await this.ReservationRepository.findOne({
        where: { id: reservationId, isDeleted: false },
        relations: {
          branch: true,
          services: true,
          order: true,
        },
      });
      if (!reservation) {
        throw new NotFoundException("Reservation not found");
      }
      const branch = await this.BranchRepository.findOneBy({ id: body.branch });
      if (!branch) {
        throw new NotFoundException("Branch not found");
      }
      // console.log(branch);
      if (reservation.branch.id == body.branch) {
        const result = await this.updateTime(
          reservationId,// @ts-ignore
          { startTime: body.startTime, day: body.day },
          userId,
        );
        console.log(result, "result");
        await this.actionService.createAction({
          actionEn: `reservation branch updated to ${branch.name} and time is ${body.startTime}`,
          actionAr: `تم تحديث فرع الحجز إلى ${branch.name} والوقت هو ${body.startTime}`,
          branch: branch.id,
          createdBy: userId,
          order: reservation.order.id,
        });
        //
        return { order: result };
      }
      const duration =
        (reservation.end_Time.getTime() - reservation.start_Time.getTime()) /
        (1000 * 60);
      const csutomStartTime = body.startTime
        ? body.startTime
        : reservation.start_Time;
      const startTime = new Date(csutomStartTime);
      const endTime = new Date(startTime.getTime() + duration * 1000 * 60);

      const workingDate = startTime;

      // Get working hours for the branch on the specific date
      const workingHours = await this.getWorkingHoursAtSpecificDate(
        body.branch,
        workingDate,
      );

      // Check if the working hours allow the reservation
      const index = workingHours.findIndex(
        (w) => w.from <= startTime && w.to >= endTime,
      );
      if (index === -1) {
        throw new BadRequestException(
          this.i18n.translate("test.RESERVATION.SCHEDULE_CONFLICT"),
        );
      }
      const newWorkingHours = this.newAddedWorkingHours(
        {
          fromOriginal: workingHours[index].from,
          toOriginal: workingHours[index].to,
          fromUser: startTime,
          toUser: endTime,
        },
        workingHours[index].slot,
      );
      await this.WorkingHourEntity.save(newWorkingHours);
      await this.WorkingHourEntity.delete({ id: workingHours[index].id });

      console.log(reservation);

      await this.cancelReservationAndAddSlot(
        reservation.reservationDay,
        reservation.reservationMonth,
        reservation.reservationYear,
        reservation.start_Time,
        reservation.end_Time,
        reservation.branch.id,
      );
      reservation.start_Time = startTime;
      reservation.end_Time = endTime;
      reservation.branch = branch;

      reservation.reservationDay = workingHours[index].slot.day;
      reservation.reservationMonth = workingHours[index].slot.month;
      reservation.reservationYear = workingHours[index].slot.year;

      const order = await this.OrderRepo.findOne({
        where: { id: reservation.order.id },
      });
      if (!order) {
        throw new NotFoundException("Order not found");
      }
      order.branch = { id: branch.id, name: branch.name };
      await this.ReservationRepository.save(reservation);
      await this.OrderRepo.save(order);
      await this.OrdersService.updateOrderTimeFromReservation(
        reservation.id,
        userId,
      );
      await this.actionService.createAction({
        actionEn: `reservation branch updated time is ${body.startTime}`,
        actionAr: `تم تحديث فرع الحجز إلى ${branch.name} والوقت هو ${body.startTime}`,
        branch: branch.id,
        createdBy: userId,
        order: reservation.order.id,
      });

      return { reservation, order };
    } catch (error) {
      if (error instanceof NotFoundException) {
        // Log specific error for not found exception
        console.error(`Error: ${error.message}`, { error });
        throw error; // Re-throw to preserve the original exception
      } else if (error instanceof BadRequestException) {
        // Log specific error for bad request exception
        console.error(`Error: ${error.message}`, { error });
        throw error; // Re-throw to preserve the original exception
      }
    }
  }
  async cancelReservationAndAddSlot(
    day: number,
    month: number,
    year: number,
    start: Date,
    end: Date,
    branchId: string,
  ) {
    const slot = await this.SlotRepository.findOne({
      where: {
        day,
        month,
        year,
        branch: {
          id: branchId,
        },
      },
    });
    if (!slot) {
      throw new HttpException(
        this.i18n.translate("test.RESERVATION.SLOT_NOT_FOUND"),
        400,
      );
    }
    const startWorkingHour = await this.WorkingHourEntity.findOne({
      where: {
        to: start,
        slot: {
          branch: {
            id: branchId,
          },
        },
      },
    });
    const endWorkingHour = await this.WorkingHourEntity.findOne({
      where: {
        from: end,
        slot: {
          branch: {
            id: branchId,
          },
        },
      },
    });
    if (startWorkingHour) {
      start = startWorkingHour.from;
      await this.WorkingHourEntity.remove(startWorkingHour);
    }
    if (endWorkingHour) {
      end = endWorkingHour.to;
      await this.WorkingHourEntity.remove(endWorkingHour);
    }
    const workingSlot = this.WorkingHourEntity.create({
      from: start,
      to: end,
      slot,
      duration: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60)),
    });
    await this.WorkingHourEntity.save(workingSlot);
  }
  async getTop5Reservations(
    fromDate: string,
    toDate: string,
    branchId: string,
  ) {
    // Parse the start and end dates
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const branch = branchId?.split(",") || [];
    end.setDate(end.getDate() + 1); // Include the end date in the query
    //   const user = await this.UserRepository.findOne({
    //     where: { id: userId },
    //   });
    //  console.log(user)

    // Build the query
    const queryBuilder = this.ReservationRepository.createQueryBuilder(
      "reservation",
    )
      .leftJoinAndSelect("reservation.customer", "customer") // Join with customer
      .leftJoinAndSelect("reservation.order", "order") // Join with order
      .where("reservation.createdAt BETWEEN :start AND :end", { start, end })
      .orderBy("reservation.totalPrice", "DESC")
      .take(5); // Limit to top 5 reservations

    // Add branch filter if branch IDs are provided
    if (branch.length > 0) {
      queryBuilder.andWhere("reservation.branchId IN (:...branch)", { branch });
    }

    // Execute the query
    const topReservations = await queryBuilder.getMany();

    // Map the results to the desired structure, including orderId with a null check
    return topReservations.map((reservation) => ({
      id: reservation.id,
      start_Time: reservation.start_Time,
      end_Time: reservation.end_Time,
      totalPrice: reservation.totalPrice,
      deposit: reservation.deposit,
      createdAt: reservation.createdAt,
      isDeleted: reservation.isDeleted,
      orderId: reservation.order ? reservation.order.id : null, // Check if order exists
      customer: {
        id: reservation.customer.id, // Ensure this property exists in the Customer entity
        name: reservation.customer.fullName, // Replace with the actual property names from the Customer entity
        email: reservation.customer.phoneNumber, // Replace with the actual property names from the Customer entity
        // Add any other customer details you need
      },
    }));
  }

  async getReservationsTimes(dto: GetReservationsTimesDto): Promise<{
    items: {
      id: string;
      start_Time: Date;
      end_Time: Date;
      customer: {
        id: string;
        phoneNumber: string;
        fullName: string;
      };
      order: {
        id: string;
        status: string;
      } | null; // Include order ID and status, nullable if no order is associated
    }[];
    total: number;
  }> {
    const { branchId, fromDate, toDate } = dto;

    // Set the fromDate to the start of the day (00:00:00)
    let startOfDay: Date | undefined;
    if (fromDate) {
      startOfDay = new Date(fromDate);
      startOfDay.setHours(0, 0, 0, 0);
    }

    // Set the toDate to the end of the day (23:59:59)
    let endOfDay: Date | undefined;
    if (toDate) {
      endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
    }

    const query = this.ReservationRepository.createQueryBuilder("reservation")
      .leftJoinAndSelect("reservation.customer", "customer") // Include customer details
      .leftJoin("reservation.branch", "branch") // Join branch
      .leftJoinAndSelect("reservation.order", "order") // Join order to get order ID and status
      .select([
        "reservation.id",
        "reservation.start_Time",
        "reservation.end_Time",
        "customer.id",
        "customer.fullName",
        "customer.phoneNumber",
        "order.id", // Select order ID
        "order.status", // Select order status
      ]);

    // Filter by branchId
    if (branchId) {
      query.andWhere("branch.id = :branchId", { branchId });
    }

    // Filter by date range using adjusted start and end times
    if (startOfDay) {
      query.andWhere("reservation.start_Time >= :fromDate", {
        fromDate: startOfDay,
      });
    }
    if (endOfDay) {
      query.andWhere("reservation.end_Time <= :toDate", { toDate: endOfDay });
    }

    // Pagination
    // const skip = (parseInt(page) - 1) * parseInt(limit);
    // query.skip(skip).take(parseInt(limit));

    // Execute the query
    const [reservations, total] = await query.getManyAndCount();

    // Map the results to flatten the response
    const items = reservations.map((reservation) => ({
      id: reservation.id,
      start_Time: reservation.start_Time,
      end_Time: reservation.end_Time,
      customer: {
        id: reservation.customer.id,
        phoneNumber: reservation.customer.phoneNumber,
        fullName: reservation.customer.fullName,
      },
      order: reservation.order
        ? {
            // Check if order exists
            id: reservation.order.id,
            status: reservation.order.status,
          }
        : null, // Set to null if no order is associated
    }));

    return { items, total };
  }
}
