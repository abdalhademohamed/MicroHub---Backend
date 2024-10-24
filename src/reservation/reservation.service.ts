import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectEntityManager, InjectRepository } from "@nestjs/typeorm";
import { Between, EntityManager, In, Repository } from "typeorm";
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
import { ReceiptService } from "../receipt/receipt.service";
import { OrderEntity } from "../orders/entities/order.entity";
import { OrdersService } from "../orders/orders.service";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { UserEntity } from "../user/entities/user.entity";
import { OfferEntity } from "../offer/entities/offer.entity";
import { GetReservationsTimesDto } from "./dto/get.reservations.timings.dto";
import { SharableOfferEntity } from "../sharable-offer/entities/sharable-offer.entity";
import { GiftCouponEntity } from "../gift-coupon/entities/gift-coupon.entity";
import { RootoshEntity } from "../rootosh/entities/rootosh.entity";
import { NotificationService } from "../notification/notification.service";
import { EmployeeEntity } from "../employee/entities/employee.entity";

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
    @InjectRepository(EmployeeEntity)
    private EmployeeRepository: Repository<EmployeeEntity>,
    private readonly notificationService: NotificationService

    // private readonly ReceiptService: ReceiptService, // Inject the new service
  ) {}
  splitIntervals(
    fromOriginal: Date,
    toOriginal: Date,
    fromUser: Date,
    toUser: Date
  ) {
    const intervals = [];
    if (fromUser > fromOriginal) {
      intervals.push({ from: fromOriginal, to: fromUser });
    }
    if (toUser < toOriginal) {
      intervals.push({ from: toUser, to: toOriginal });
    }
    return intervals;
  }
  async selectBranch(branchId: string): Promise<BranchEntity> {
    // Find the branch by ID
    const branch = await this.BranchRepository.findOne({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    return branch;
  }

  async registerOrLookupCustomer(
    createCustomerDto: CreateCustomerDto
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
    ids: string[]
  ): Promise<{ price: number; duration: number; services: ServiceEntity[] }> {
    const services = await this.ServiceRepository.findByIds(ids);

    if (services.length !== ids.length) {
      throw new HttpException("Invalid Service IDs", 400);
    }

    // Use array reduction to sum the price and duration
    const { price, duration } = services.reduce(
      (acc, service) => {
        acc.price += Number(service.price); // Ensure price is a number
        acc.duration += service.duration_Mins;
        return acc;
      },
      { price: 0, duration: 0 } // Initial accumulator
    );

    return { price, duration, services };
  }

  async calculateRootoshTotalDuration(
    ids: string[]
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
      { price: 0, duration: 0 } // Initial accumulator
    );

    return { price, duration, rootosh };
  }
  async getWorkingHoursAtSpecificDate(branchId: string, day: Date) {
    const workingHours = await this.WorkingHourEntity.find({
      where: {
        slot: {
          branch: {
            id: branchId,
          },
          day: day.getDate(),
          month: day.getMonth() + 1,
          year: day.getFullYear(),
        },
      },
      relations: {
        slot: {
          branch: true,
        },
      },
    });
    return workingHours;
  }
  newAddedWorkingHours(
    body: {
      fromUser: Date;
      toUser: Date;
      fromOriginal: Date;
      toOriginal: Date;
    },
    slot: SlotsEntity
  ) {
    const Intervals = this.splitIntervals(
      body.fromOriginal,
      body.toOriginal,
      body.fromUser,
      body.toUser
    );
    const newWorkingHours = [];
    for (const { from, to } of Intervals) {
      const duration = Math.floor(
        (to.getTime() - from.getTime()) / (1000 * 60)
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
        day: date.getDate(),
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        branch: {
          id: branchId,
        },
      },
    });
    if (!slot) {
      throw new NotFoundException("Slot not found");
    }
    return slot;
  }

  // async createReservation(
  //   body: CreateReservationDto,
  //   image: Express.Multer.File,
  //   userId: string
  // ) {
  //   try {
  //     // Validate branch existence
  //     const branch = await this.BranchRepository.findOne({
  //       where: { id: body.branch },
  //     });
  //     if (!branch) {
  //       throw new NotFoundException("Branch not found");
  //     }

  //     let serviceIds: string[] = [];
  //     let services: ServiceEntity[] = [];

  //     // Check if at least one of services, offerId, sharableOfferId, or couponCode is provided
  //     if (!body.services || body.services.length === 0) {
  //       if (!body.offerId && !body.sharableOfferId && !body.couponCode) {
  //         throw new BadRequestException(
  //           "At least one of services, offerId, sharableOfferId, or couponCode must be provided"
  //         );
  //       }
  //     }

  //     // Check if services are provided
  //     if (body.services && body.services.length > 0) {
  //       serviceIds = body.services;

  //       // Fetch services based on provided IDs
  //       services = await this.ServiceRepository.find({
  //         where: { id: In(serviceIds) },
  //       });
  //       if (services.length !== serviceIds.length) {
  //         throw new BadRequestException("Some services were not found");
  //       }
  //     }

  //     // Check if offerId is provided
  //     if (body.offerId) {
  //       const offer = await this.OfferRepository.findOne({
  //         where: { id: body.offerId },
  //         relations: ["services"],
  //       });
  //       if (!offer) {
  //         throw new NotFoundException("Offer not found");
  //       }
  //       serviceIds = offer.services.map((service) => service.id); // Extract service IDs from the offer
  //       services = offer.services; // Use services from the offer
  //     }

  //     // Check for sharable offer and add its services if applicable
  //     if (body.sharableOfferId) {
  //       const sharableOffer = await this.SharableOfferRepository.findOne({
  //         where: { id: body.sharableOfferId },
  //         relations: ["services"],
  //       });
  //       if (!sharableOffer) {
  //         throw new NotFoundException("Sharable offer not found");
  //       }
  //       if (Array.isArray(sharableOffer.services)) {
  //         services = [...services, ...sharableOffer.services]; // Include sharable offer services
  //       } else {
  //         throw new BadRequestException(
  //           "Sharable offer has no valid services"
  //         );
  //       }
  //     }

  //     // Check for coupon code and add its services if applicable
  //     if (body.couponCode) {
  //       const coupon = await this.GiftCouponRepository.findOne({
  //         where: { couponCode: body.couponCode },
  //       });

  //       if (!coupon) {
  //         throw new NotFoundException("Coupon code not found");
  //       }

  //       // Check if the coupon is already redeemed
  //       if (coupon.isRedeemed) {
  //         throw new ConflictException("Coupon has already been redeemed");
  //       }

  //       // Transform the coupon services into ServiceEntity type
  //       const transformedServices: ServiceEntity[] = coupon.services.map(
  //         (service) => this.mapCouponServiceToServiceEntity(service)
  //       );

  //       // Merge the transformed services
  //       services = [...services, ...transformedServices];
  //     }

  //     // Calculate total duration and price of services
  //     const { duration, price } = await this.calculateTotalDuration(serviceIds);

  //     // Handle custom time
  //     const startTime = new Date(body.customStartTime);
  //     const endTime = new Date(startTime.getTime() + duration * 1000 * 60);

  //     // Get working hours for the branch on the specific date
  //     const workingHours = await this.getWorkingHoursAtSpecificDate(
  //       body.branch,
  //       startTime
  //     );

  //     // Check if the working hours allow the reservation
  //     const index = workingHours.findIndex(
  //       (w) => w.from <= startTime && w.to >= endTime
  //     );
  //     if (index === -1) {
  //       throw new BadRequestException(
  //         "The custom schedule conflicts with an existing reservation."
  //       );
  //     }

  //     // Ensure image is provided
  //     if (!image) {
  //       throw new BadRequestException("Photo is required");
  //     }

  //     // Upload image to Cloudinary
  //     const folderName = "reservation";
  //     const result = await this.CloudinaryService.uploadImage(
  //       image,
  //       folderName
  //     );

  //     // Validate customer existence
  //     const customer = await this.CustomerRepository.findOneBy({
  //       phoneNumber: body.phone_Number,
  //     });
  //     if (!customer) {
  //       throw new NotFoundException("Customer not found");
  //     }
  //     if (body.deposit && body.deposit > Math.ceil(price)) {
  //       throw new BadRequestException("The deposit can't be more than the total price");
  //     }

  //     // Create and save reservation
  //     const reservation = this.ReservationRepository.create({
  //       customer,
  //       totalPrice: Math.ceil(price),
  //       deposit: body.deposit,
  //       start_Time: startTime,
  //       end_Time: endTime,
  //       reservationDay: startTime.getDate(),
  //       reservationMonth: startTime.getMonth() + 1,
  //       reservationYear: startTime.getFullYear(),
  //       branch,
  //       deposit_Content: result.url,
  //       services,
  //     });

  //     await this.ReservationRepository.save(reservation);

  //     // Create an order for the reservation
  //     await this.OrdersService.createOrder(
  //       reservation.id,
  //       userId,
  //       body.paymentId,
  //       body.offerId,
  //       body.sharableOfferId,
  //     );

  //     // Adjust working hours based on the new reservation
  //     const newWorkingHours = this.newAddedWorkingHours(
  //       {
  //         fromOriginal: workingHours[index].from,
  //         toOriginal: workingHours[index].to,
  //         fromUser: startTime,
  //         toUser: endTime,
  //       },
  //       workingHours[index].slot
  //     );

  //     await this.WorkingHourEntity.save(newWorkingHours);
  //     await this.WorkingHourEntity.delete({ id: workingHours[index].id });

  //     // Create an audit log for the reservation creation
  //     const log = new AuditLogEntity();
  //     log.tableName = "reservation";
  //     log.action = "INSERT";
  //     log.entityId = reservation.id;
  //     log.performedBy = userId;

  //     const user = await this.UserRepository.findOne({
  //       where: { id: userId },
  //       select: ["id", "username", "email", "role"],
  //     });

  //     if (user) {
  //       log.userDetails = user;
  //     }

  //     await this.entityManager.save(AuditLogEntity, log);

  //     return { reservation };
  //   } catch (error) {
  //     // Granular error handling and categorization
  //     if (error instanceof NotFoundException) {
  //       throw new NotFoundException({
  //         message: error.message,
  //         category: "EntityNotFound", // Custom error category
  //       });
  //     } else if (error instanceof BadRequestException) {
  //       throw new BadRequestException({
  //         message: error.message,
  //         category: "ValidationError", // Custom error category
  //       });
  //     } else if (error instanceof ConflictException) {
  //       throw new ConflictException({
  //         message: error.message,
  //         category: "ConflictError", // Custom error category
  //       });
  //     } else {
  //       throw new InternalServerErrorException({
  //         message: error.message || "Unexpected error occurred",
  //         category: "InternalServerError", // Custom error category for unexpected errors
  //       });
  //     }
  //   }
  // }

  async createReservation(
    body: CreateReservationDto,
    image: Express.Multer.File,
    userId: string
  ) {
    try {
      // Validate branch existence
      const branch = await this.BranchRepository.findOne({
        where: { id: body.branch },
      });
      if (!branch) {
        throw new NotFoundException("Branch not found");
      }

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
            "At least one of services, offerId, rootosh , sharableOfferId, or couponCode must be provided"
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
        serviceIds = offer.services.map((service) => service.id); // Extract service IDs from the offer
        services = offer.services; // Use services from the offer
      }

      // Check for sharable offer and add its services if applicable
      if (body.sharableOfferId) {
        const sharableOffer = await this.SharableOfferRepository.findOne({
          where: { id: body.sharableOfferId },
          relations: ["services"],
        });
        if (!sharableOffer) {
          throw new NotFoundException("Sharable offer not found");
        }
        if (Array.isArray(sharableOffer.services)) {
          services = [...services, ...sharableOffer.services]; // Include sharable offer services
        } else {
          throw new BadRequestException("Sharable offer has no valid services");
        }
      }

      // Check for coupon code and add its services if applicable
      if (body.couponCode) {
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

        // Transform the coupon services into ServiceEntity type
        const transformedServices: ServiceEntity[] = coupon.services.map(
          (service) => this.mapCouponServiceToServiceEntity(service)


          
        );

        // Merge the transformed services
        services = [...services, ...transformedServices];
        body.deposit = 0;
        body.deposit_Content = null;
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
      if(body.services && body.services.length > 0  || body.sharableOfferId  ||body.offerId ) {
        const serviceTotals = await this.calculateTotalDuration(serviceIds);
        duration += serviceTotals.duration;
        price += serviceTotals.price;

        // Ensure image is provided
        if (!image) {
          throw new BadRequestException("Photo is required");
        }

        // Upload image to Cloudinary
        const folderName = "reservation";
        result = await this.CloudinaryService.uploadImage(image, folderName);
        body.deposit_Content = result.url;
      }

      // Handle custom time
      const startTime = new Date(body.customStartTime);
      const endTime = new Date(startTime.getTime() + duration * 1000 * 60);

      // Get working hours for the branch on the specific date
      const workingHours = await this.getWorkingHoursAtSpecificDate(
        body.branch,
        startTime
      );

      // Check if the working hours allow the reservation
      const index = workingHours.findIndex(
        (w) => w.from <= startTime && w.to >= endTime
      );
      if (index === -1) {
        throw new BadRequestException(
          "The custom schedule conflicts with an existing reservation."
        );
      }

      // Validate customer existence
      const customer = await this.CustomerRepository.findOneBy({
        phoneNumber: body.phone_Number,
      });
      if (!customer) {
        throw new NotFoundException("Customer not found");
      }
      if (body.deposit && body.deposit > Math.ceil(price)) {
        throw new BadRequestException(
          "The deposit can't be more than the total price"
        );
      }
      // Validate employee existence
      const employee = await this.UserRepository.findOne({where:{id:userId}});
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
        reservationDay: startTime.getDate(),
        reservationMonth: startTime.getMonth() + 1,
        reservationYear: startTime.getFullYear(),
        branch,
        deposit_Content: body.deposit_Content,
        services,
        rootoshes,
        createdBy:userId
      });
      await this.ReservationRepository.save(reservation);
      // New code to check for existing reservations for the week
      // const startOfWeek = new Date(startTime);
      // startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Get the first day of the week (Sunday)

      // const endOfWeek = new Date(startOfWeek);
      // endOfWeek.setDate(endOfWeek.getDate() + 6); // Get the last day of the week (Saturday)

      // // Fetch reservations for the branch in the upcoming week
      // const existingReservations = await this.ReservationRepository.find({
      //   where: {
      //     branch: { id: branch.id },
      //     start_Time: Between(startOfWeek, endOfWeek),
      //   },
      // });

      // if (existingReservations.length >= 7) {
      //   // Create a notification if there are reservations for every day of the week
      //   this.notificationService.createNotification(
      //     userId,
      //     "full week branch reservation",
      //     `Reservations exist for the entire week at branch ${branch.name}.`
      //   );
      // }

      if (body.rootosh && body.rootosh.length > 0) {
        await this.OrdersService.createOrderForRootosh(reservation.id, userId);
      } else {

        // Create an order for the reservation
        await this.OrdersService.createOrder(
          reservation.id,
          userId,
          body.paymentId,
          body.offerId,
          body.sharableOfferId,
          body.couponCode
        );
      }

      // Adjust working hours based on the new reservation
      const newWorkingHours = this.newAddedWorkingHours(
        {
          fromOriginal: workingHours[index].from,
          toOriginal: workingHours[index].to,
          fromUser: startTime,
          toUser: endTime,
        },
        workingHours[index].slot
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

      return { reservation };
    } catch (error) {
      // Granular error handling and categorization
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
        throw new InternalServerErrorException({
          message: error.message || "Unexpected error occurred",
          category: "InternalServerError", // Custom error category for unexpected errors
        });
      }
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

  async getAllReservations(
    getReservationsDto: GetReservationsDto,
    branchId?: string
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
      .leftJoinAndSelect("reservation.customer", "customer"); // Join the customer entity

    // Apply filters
    if (day) {
      query.andWhere("reservation.reservationDay = :day", { day });
    }
    if (month) {
      query.andWhere("reservation.reservationMonth = :month", { month });
    }
    if (year) {
      query.andWhere("reservation.reservationYear = :year", { year });
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
  async getBookingBranch(branchId: string, query: GetReservationsDto) {
    const { day, month, year, page = 1, limit = 10 } = query;

    const reservationQuery = this.ReservationRepository.createQueryBuilder(
      "reservation"
    )
      .select([
        "reservation.id",
        "reservation.start_Time",
        "reservation.end_Time",
      ])
      .innerJoin("reservation.branch", "branch")
      .where("branch.id = :branchId", { branchId });

    if (day) {
      reservationQuery.andWhere("reservation.reservationDay = :day", { day });
    }

    if (month) {
      reservationQuery.andWhere("reservation.reservationMonth = :month", {
        month,
      });
    }

    if (year) {
      reservationQuery.andWhere("reservation.reservationYear = :year", {
        year,
      });
    }

    reservationQuery.skip((page - 1) * limit).take(limit);

    const [items, total] = await reservationQuery.getManyAndCount();

    return { items, page, total };
  }

  async updateReservationServices(
    id: string,
    body: UpdateReservationDto,
    userId: string
  ) {
    const reservation = await this.ReservationRepository.findOne({
      where: { id },
      relations: {
        branch: true,
        services: true, // Ensure related services are included
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    const { duration, services, price } = await this.calculateTotalDuration(
      body.services
    );
    const startTime = new Date(body.startTime);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    const workingHours = await this.getWorkingHoursAtSpecificDate(
      reservation.branch.id,
      startTime
    );

    const index = workingHours.findIndex(
      (w) => w.from <= startTime && w.to >= endTime
    );
    if (index === -1) {
      throw new BadRequestException(
        "The custom schedule conflicts with an existing reservation."
      );
    }

    const newWorkingHours = this.newAddedWorkingHours(
      {
        fromOriginal: workingHours[index].from,
        toOriginal: workingHours[index].to,
        fromUser: startTime,
        toUser: endTime,
      },
      workingHours[index].slot
    );

    await this.cancelReservationAndAddSlot(
      reservation.start_Time,
      reservation.end_Time,
      reservation.branch.id
    );
    await this.WorkingHourEntity.save(newWorkingHours);
    await this.WorkingHourEntity.delete({ id: workingHours[index].id });

    // Log the changes before saving the updated reservation
    const oldReservation = { ...reservation }; // Clone the old reservation for comparison
    reservation.start_Time = startTime;
    reservation.end_Time = endTime;
    reservation.services = services;
    reservation.totalPrice = price;

    await this.ReservationRepository.save(reservation);

    // // Create a new order for the updated reservation
    // await this.OrdersService.createOrder(reservation.id, userId,body.paymentId);
    // Call to update the associated order with the updated services
    const updatedOrder =
      await this.OrdersService.updateOrderServicesFromReservation(
        reservation.id,
        userId
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
    try {
      const reservation = await this.ReservationRepository.findOne({
        where: { id },
        relations: {
          branch: true,
          services: true,
        },
      });
      const oldReservation = { ...reservation }; // Clone the old reservation for comparison

      if (!reservation) {
        throw new NotFoundException(`Reservation with ID ${id} not found`);
      }
      const acc = { price: 0, duration: 0 };
      for (const service of reservation.services) {
        acc.price += service.price;
        acc.duration += service.duration_Mins;
      }
      const startTime = new Date(body.startTime);
      const endTime = new Date(startTime.getTime() + acc.duration * 60 * 1000);

      const workingHours = await this.getWorkingHoursAtSpecificDate(
        reservation.branch.id,
        startTime
      );
  
      const index = workingHours.findIndex(
        (w) => w.from <= startTime && w.to >= endTime
      );
      if (index === -1) {
        throw new BadRequestException(
          "The custom schedule conflicts with an existing reservation."
        );
      }
   // Update the reservation with new times
   reservation.start_Time = startTime;
   reservation.end_Time = endTime;

   await this.ReservationRepository.save(reservation);
      const newWorkingHours = this.newAddedWorkingHours(
        {
          fromOriginal: workingHours[index].from,
          toOriginal: workingHours[index].to,
          fromUser: startTime,
          toUser: endTime,
        },
        workingHours[index].slot
      );
  
      await this.WorkingHourEntity.save(newWorkingHours);
      await this.WorkingHourEntity.delete({ id: workingHours[index].id });

      await this.cancelReservationAndAddSlot(
        oldReservation.start_Time,
        oldReservation.end_Time,
        oldReservation.branch.id
      );




  
      // Log the changes before updating the reservation

     
      const updatedOrder =
        await this.OrdersService.updateOrderTimeFromReservation(
          reservation.id,
          userId
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
          "An error occurred while updating the reservation."
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
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }
    reservation.isDeleted = true;
    // Delete the reservation
    await this.ReservationRepository.save(reservation);
    if (reservation.start_Time <= new Date()) {
      return { status: "deleted" };
    }
    await this.cancelReservationAndAddSlot(
      reservation.start_Time,
      reservation.end_Time,
      reservation.branch.id
    );
    return { status: "deleted" };
  }
  async cancelReservationAndAddSlot(start: Date, end: Date, branchId: string) {
    const slot = await this.SlotRepository.findOne({
      where: {
        day: start.getDate(),
        month: start.getMonth() + 1,
        year: start.getFullYear(),
        branch: {
          id: branchId,
        },
      },
    });
    if (!slot) {
      throw new HttpException("slot not found", 400);
    }
    const startWorkingHour = await this.WorkingHourEntity.findOne({
      where: { 
        to: start,
        slot: {
          branch: {
            id: branchId,
          }
        }
      },
    });
    const endWorkingHour = await this.WorkingHourEntity.findOne({
      where: { 
        from: end,
        slot: {
          branch: {
            id: branchId,
          }
        }
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
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    // Use a generic type here since we're transforming the response
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1); // Include the end date in the query

    const topReservations = await this.ReservationRepository.createQueryBuilder(
      "reservation"
    )
      .leftJoinAndSelect("reservation.customer", "customer") // Adjust this if the relationship name is different
      .where("reservation.createdAt BETWEEN :start AND :end", { start, end })
      .orderBy("reservation.totalPrice", "DESC")
      .take(5) // Limit the results to top 5
      .getMany();

    // Map the results to the desired structure
    return topReservations.map((reservation) => ({
      id: reservation.id,
      start_Time: reservation.start_Time,
      end_Time: reservation.end_Time,
      totalPrice: reservation.totalPrice,
      deposit: reservation.deposit,
      createdAt: reservation.createdAt,
      isDeleted: reservation.isDeleted,
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
    }[];
    total: number;
  }> {
    const { branchId, fromDate, toDate, page = "1", limit = "10" } = dto;

    // Set the fromDate to the start of the day (00:00:00)
    let startOfDay: Date | undefined;
    if (fromDate) {
      startOfDay = new Date(fromDate);
      startOfDay.setHours(0, 0, 0, 0); // Set time to 00:00:00
    }

    // Set the toDate to the end of the day (23:59:59)
    let endOfDay: Date | undefined;
    if (toDate) {
      endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999); // Set time to 23:59:59
    }

    const query = this.ReservationRepository.createQueryBuilder("reservation")
      .leftJoinAndSelect("reservation.customer", "customer") // Ensure customer details are included
      .leftJoin("reservation.branch", "branch") // Join branch
      .select([
        "reservation.id",
        "reservation.start_Time",
        "reservation.end_Time",
        "customer.id", // Customer ID
        "customer.fullName", // Customer full name
        "customer.phoneNumber", // Customer phone number
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
    const skip = (parseInt(page) - 1) * parseInt(limit);
    query.skip(skip).take(parseInt(limit));

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
    }));

    return { items, total };
  }
}
