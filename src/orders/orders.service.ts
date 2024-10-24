import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import { InjectEntityManager, InjectRepository } from "@nestjs/typeorm";
import { OrderEntity } from "./entities/order.entity";
import { EntityManager, Repository } from "typeorm";
import { ReservationEntity } from "../reservation/entities/reservation.entity";

import { EmployeeEntity } from "../employee/entities/employee.entity";
import { FindOrdersDto } from "./dto/find.all.orders.dto";
import { OrderStatus } from "./utils/order.status.enum";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { UserEntity } from "../user/entities/user.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { FindOrdersByDayDto } from "./dto/find.orders.dto.for.artist";
import { PaymentEntity } from "../payment/entities/payment.entity";
import { PositionEntity } from "../postion/entities/postion.entity";
import { Postion } from "../postion/utils/postion.enum";
import { ArtistDto } from "./dto/artist.dto";
import { Role } from "../user/utils/user.enum";
import { CustomerEntity } from "../customer/entities/customer.entity";
import { OfferEntity } from "../offer/entities/offer.entity";
import { NotificationService } from "../notification/notification.service";
import { Console } from "console";
import { SharableOfferEntity } from "../sharable-offer/entities/sharable-offer.entity";
import { GiftCouponService } from "../gift-coupon/gift-coupon.service";
import { CreateGiftCouponDto } from "../gift-coupon/dto/create-gift-coupon.dto";
import { PaymentStatus } from "./utils/payment.status.enum";
import { ReservationService } from "../reservation/reservation.service";

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,

    private readonly CloudinaryService: CloudinaryService,

    @InjectRepository(ReservationEntity)
    private readonly reservationRepository: Repository<ReservationEntity>,

    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(PaymentEntity)
    private readonly PaymentRepository: Repository<PaymentEntity>,

    @InjectRepository(PositionEntity)
    private readonly PositionRepository: Repository<PositionEntity>,

    @InjectRepository(OfferEntity)
    private readonly OfferRepository: Repository<OfferEntity>,

    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly notificationService: NotificationService, // Inject NotificationService

    @InjectRepository(SharableOfferEntity)
    private readonly SharableOfferRepository: Repository<SharableOfferEntity>,
    private readonly GiftCouponService: GiftCouponService,
    @Inject(forwardRef(() => ReservationService))  // Inject ReservationService
    private readonly reservationService: ReservationService,
  ) {}
  // Method to generate a unique incremental invoice number
  private async generateUniqueInvoiceNumber(): Promise<number> {
    const latestOrder = await this.orderRepository
      .createQueryBuilder("order")
      .select("MAX(order.invoiceNumber)", "max")
      .getRawOne();

    // If there are no orders yet, start with 1
    const nextInvoiceNumber = latestOrder.max ? latestOrder.max + 1 : 1;

    return nextInvoiceNumber;
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // async createOrder(
  //   reservationId: string,
  //   userId: string,
  //   paymentId: string,
  //   offerId?: string,
  //   sharableOfferId?: string
  // ): Promise<OrderEntity> {
  //   // Fetch reservation with related services
  //   const reservation = await this.reservationRepository.findOne({
  //     where: { id: reservationId },
  //     relations: ["services", "customer", "branch"],
  //   });

  //   if (!reservation) {
  //     throw new NotFoundException("Reservation not found");
  //   }

  //   // Fetch the user who is creating the order, limiting the fields returned
  //   const createdBy = await this.userRepository.findOne({
  //     where: { id: userId },
  //     select: ["id", "username", "email", "role"], // Only return these fields
  //   });
  //   if (!createdBy) {
  //     throw new NotFoundException(`User with ID ${userId} not found`);
  //   }

  //   // Find the payment method with 'Visa'
  //   const visaPayment = await this.PaymentRepository.findOne({
  //     where: { id: paymentId },
  //   });

  //   if (!visaPayment) {
  //     throw new NotFoundException(
  //       "Visa payment method not found, please add payment method called Visa in English & arabic",
  //     );
  //   }

  //   const invoiceNumber = await this.generateUniqueInvoiceNumber();

  //   const newOrder = this.orderRepository.create({
  //     customer: reservation.customer,
  //     date: `${reservation.reservationYear}-${reservation.reservationMonth}-${reservation.reservationDay}`,
  //     serviceEnglish: reservation.services
  //       .map((service) => service.english_Name)
  //       .join(", "),
  //     serviceArabic: reservation.services
  //       .map((service) => service.arabic_Name)
  //       .join(", "),
  //     status: OrderStatus.Completed,
  //     paymentStatus: "partially paid",
  //     invoiceNumber: invoiceNumber,
  //     comments: [],
  //     reservation: reservation,
  //     branch: {
  //       id: reservation.branch.id, // Include branch ID
  //       name: reservation.branch.name, // Include branch name
  //     }, // Return an object with id and name of the branch
  //     artist: null,
  //     createdBy, // Set createdBy field with limited user data
  //     payment: visaPayment, // Assign the Visa payment method to the order
  //     offerId,
  //     sharableOfferId,
  //   });

  //   try {
  //     return await this.entityManager.transaction(
  //       async (transactionalEntityManager) => {
  //         // Save the new order
  //         const savedOrder = await transactionalEntityManager.save(
  //           OrderEntity,
  //           newOrder,
  //         );

  //         // Create an audit log entry
  //         const auditLog = new AuditLogEntity();
  //         auditLog.tableName = "order";
  //         auditLog.action = "INSERT";
  //         auditLog.entityId = savedOrder.id; // ID of the created order
  //         auditLog.performedBy = userId; // User who created the order

  //         // Fetch user details if needed
  //         if (userId) {
  //           const user = await transactionalEntityManager.findOne(UserEntity, {
  //             where: { id: userId },
  //           });
  //           if (user) {
  //             auditLog.userDetails = {
  //               id: user.id,
  //               username: user.username,
  //               email: user.email,
  //               role: user.role,
  //             };
  //           }
  //         }

  //         await transactionalEntityManager.save(AuditLogEntity, auditLog);

  //         return savedOrder;
  //       },
  //     );
  //   } catch (error) {
  //     throw new InternalServerErrorException(
  //       "Failed to create order",
  //       error.stack,
  //     );
  //   }
  // }

  // async createOrder(
  //   reservationId: string,
  //   userId: string,
  //   paymentId: string,
  //   offerId?: string,
  //   sharableOfferId?: string
  // ): Promise<OrderEntity> {
  //   // Fetch reservation with related services
  //   const reservation = await this.reservationRepository.findOne({
  //     where: { id: reservationId },
  //     relations: ["services", "customer", "branch"],
  //   });

  //   if (!reservation) {
  //     throw new NotFoundException("Reservation not found");
  //   }

  //   // Fetch the user who is creating the order, limiting the fields returned
  //   const createdBy = await this.userRepository.findOne({
  //     where: { id: userId },
  //     select: ["id", "username", "email", "role"], // Only return these fields
  //   });
  //   if (!createdBy) {
  //     throw new NotFoundException(`User with ID ${userId} not found`);
  //   }

  //   // Find the payment method with 'Visa'
  //   const visaPayment = await this.PaymentRepository.findOne({
  //     where: { id: paymentId },
  //   });

  //   if (!visaPayment) {
  //     throw new NotFoundException(
  //       "Visa payment method not found, please add payment method called Visa in English & arabic"
  //     );
  //   }

  //   const invoiceNumber = await this.generateUniqueInvoiceNumber();

  //   const newOrder = this.orderRepository.create({
  //     customer: reservation.customer,
  //     date: `${reservation.reservationYear}-${reservation.reservationMonth}-${reservation.reservationDay}`,
  //     serviceEnglish: reservation.services
  //       .map((service) => service.english_Name)
  //       .join(", "),
  //     serviceArabic: reservation.services
  //       .map((service) => service.arabic_Name)
  //       .join(", "),
  //     status: OrderStatus.Completed,
  //     paymentStatus: "partially paid",
  //     invoiceNumber: invoiceNumber,
  //     comments: [],
  //     reservation: reservation,
  //     branch: {
  //       id: reservation.branch.id, // Include branch ID
  //       name: reservation.branch.name, // Include branch name
  //     }, // Return an object with id and name of the branch
  //     artist: null,
  //     createdBy, // Set createdBy field with limited user data
  //     payment: visaPayment, // Assign the Visa payment method to the order
  //     offerId,
  //     sharableOfferId,
  //   });

  //   try {
  //     return await this.entityManager.transaction(
  //       async (transactionalEntityManager) => {
  //         // Save the new order
  //         const savedOrder = await transactionalEntityManager.save(
  //           OrderEntity,
  //           newOrder
  //         );

  //         // Create an audit log entry
  //         const auditLog = new AuditLogEntity();
  //         auditLog.tableName = "order";
  //         auditLog.action = "INSERT";
  //         auditLog.entityId = savedOrder.id; // ID of the created order
  //         auditLog.performedBy = userId; // User who created the order

  //         // Fetch user details if needed
  //         if (userId) {
  //           const user = await transactionalEntityManager.findOne(UserEntity, {
  //             where: { id: userId },
  //           });
  //           if (user) {
  //             auditLog.userDetails = {
  //               id: user.id,
  //               username: user.username,
  //               email: user.email,
  //               role: user.role,
  //             };
  //           }
  //         }

  //         await transactionalEntityManager.save(AuditLogEntity, auditLog);

  //         return savedOrder;
  //       }
  //     );
  //   } catch (error) {
  //     throw new InternalServerErrorException(
  //       "Failed to create order",
  //       error.stack
  //     );
  //   }
  // }
  /* -------------------------------------------------------------------------- */
  /*                                 createOrder                                */
  /* -------------------------------------------------------------------------- */
  async createOrder(
    reservationId: string,
    userId: string,
    paymentId: string,
    offerId?: string,
    sharableOfferId?: string,
    couponCode?: string

  ): Promise<OrderEntity> {
    // Fetch reservation with related services
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
      relations: ["services", "customer", "branch"],
    });
    if (!reservation) {
      throw new NotFoundException("Reservation not found");
    }

    // Fetch the user who is creating the order, limiting the fields returned
    const createdBy = await this.userRepository.findOne({
      where: { id: userId },
      select: ["id", "username", "email", "role"], // Only return these fields
    });
    if (!createdBy) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Find the payment method with 'Visa'
    const visaPayment = await this.PaymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!visaPayment) {
      throw new NotFoundException(
        "Visa payment method not found, please add payment method called Visa in English & Arabic"
      );
    }
    if (offerId) {
      const offer = await this.OfferRepository.findOne({
        where: { id: offerId },
      });

      if (!offer) {
        throw new NotFoundException(`Offer with ID ${offerId} not found`);
      }

      // Increment the usage count of the offer
      offer.usageCount += 1;
      await this.OfferRepository.save(offer); // Save the updated offer
    }

    if (sharableOfferId!==null) {
      const sharableOffer = await this.SharableOfferRepository.findOne({
        where: { id: sharableOfferId },
      });

      if (!sharableOffer) {
        throw new NotFoundException(
          `sharableOffer with ID ${sharableOffer} not found`
        );
      }

      // Increment the usage count of the offer
      sharableOffer.usageCount += 1;
      await this.SharableOfferRepository.save(sharableOffer); // Save the updated offer

      // // Create a new gift coupon after saving the sharable offer
      // const createGiftCouponDto: CreateGiftCouponDto = {
      //   sharableOfferId: sharableOffer.id, // Use the saved offer ID
      //   customerId: reservation.customer.id, // Assuming customerId is available in offerData
      // };
      // // After saving the sharable offer, create a gift coupon for its services
      // await this.GiftCouponService.createGiftCoupon(createGiftCouponDto);
    }

     // Set payment status based on coupon code
  let payStatus = PaymentStatus.PartiallyPaid;
  if (couponCode) {
    payStatus = PaymentStatus.Paid;
  }
    const invoiceNumber = await this.generateUniqueInvoiceNumber();

    // Create new order
    const newOrder = this.orderRepository.create({
      customer: reservation.customer,
      date: `${reservation.reservationYear}-${reservation.reservationMonth}-${reservation.reservationDay}`,
      serviceEnglish: reservation.services
        .map((service) => service.english_Name)
        .join(", "),
      serviceArabic: reservation.services
        .map((service) => service.arabic_Name)
        .join(", "),
      status: OrderStatus.Pending,
      paymentStatus:payStatus , // Set payment status dynamically
      invoiceNumber: invoiceNumber,
      comments: [],
      reservation: reservation,
      branch: {
        id: reservation.branch.id, // Include branch ID
        name: reservation.branch.name, // Include branch name
      },
      artist: null,
      createdBy, // Set createdBy field with limited user data
      payment: visaPayment, // Assign the Visa payment method to the order
      offerId,
      sharableOfferId,
    });

    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          // Save the new order
          const savedOrder = await transactionalEntityManager.save(
            OrderEntity,
            newOrder
          );

          // Update customer's last services list and last rootoshes
          const customer = await transactionalEntityManager.findOne(
            CustomerEntity,
            {
              where: { id: reservation.customer.id },
              relations: ["lastServices", "lastRootoshes"], // Load last services and rootoshes
            }
          );

          if (customer) {
            // Fetch reservation again to get services with their rootoshes
            const reservationWithServices =
              await this.reservationRepository.findOne({
                where: { id: reservationId },
                relations: ["services", "services.rootosh"], // Load services and their rootosh entities
              });

            const services = reservationWithServices.services;

            // Update last services list
            if (customer.lastServices) {
              customer.lastServices.push(...services);
            } else {
              customer.lastServices = [...services];
            }

            // Gather rootosh list from services
            const rootoshList = services.flatMap((service) => service.rootosh);

            // Update last rootoshes and handle expiration dates
            for (const rootosh of rootoshList) {
              // Update the last rootoshes
              if (customer.lastRootoshes) {
                customer.lastRootoshes.push(rootosh); // Add new rootosh
              } else {
                customer.lastRootoshes = [rootosh]; // Initialize with the first rootosh
              }

              // Update expiration date logic
              if (rootosh.expireduration) {
                const expirationDate = new Date();
                expirationDate.setDate(
                  expirationDate.getDate() + rootosh.expireduration
                ); // Calculate expiration date
                // Assuming `rootosh` has a property to store its expiration date
                customer.rootoshesexpirationDate = expirationDate;
              } else {
                throw new NotFoundException("no rootosh expiration date");
              }
            }
            // Save the updated customer
            await transactionalEntityManager.save(CustomerEntity, customer);
          }

          // Create an audit log entry
          const auditLog = new AuditLogEntity();
          auditLog.tableName = "order";
          auditLog.action = "INSERT";
          auditLog.entityId = savedOrder.id; // ID of the created order
          auditLog.performedBy = userId; // User who created the order

          // Fetch user details if needed
          if (userId) {
            const user = await transactionalEntityManager.findOne(UserEntity, {
              where: { id: userId },
            });
            if (user) {
              auditLog.userDetails = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
              };
            }
          }

          await transactionalEntityManager.save(AuditLogEntity, auditLog);
          // Fetch users with roles 'Branch Manager' and 'Admin'
          const usersToNotify = await transactionalEntityManager.find(
            UserEntity,
            {
              where: [
                { role: Role.BRANCHMANAGER },
                { role: Role.SUPERADMIN },
                { role: Role.SUPERADMIN },
              ],
            }
          );

          // Send notifications to each user
          for (const user of usersToNotify) {
            await this.notificationService.createNotification(
              user.id,
              "new order created",
              `A new order has been created: ${savedOrder.id}`
            );
          }
          return savedOrder;
        }
      );
    } catch (error) {
      console.log(error.stack);
      throw new InternalServerErrorException(
        "Failed to create order",
        error.stack
      );
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            CreateOrderForRootosh                           */
  /* -------------------------------------------------------------------------- */
  async createOrderForRootosh(
    reservationId: string,
    userId: string
  ): Promise<OrderEntity> {
    // Fetch reservation with related services
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
      relations: ["rootoshes", "customer", "branch"],
    });

    if (!reservation) {
      throw new NotFoundException("Reservation not found");
    }

    // Fetch the user who is creating the order, limiting the fields returned
    const createdBy = await this.userRepository.findOne({
      where: { id: userId },
      select: ["id", "username", "email", "role"], // Only return these fields
    });
    if (!createdBy) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const invoiceNumber = await this.generateUniqueInvoiceNumber();

    // Create new order
    const newOrder = this.orderRepository.create({
      customer: reservation.customer,
      date: `${reservation.reservationYear}-${reservation.reservationMonth}-${reservation.reservationDay}`,
      serviceEnglish: reservation.rootoshes
        .map((rootoshes) => rootoshes.english_Name)
        .join(", "),
      serviceArabic: reservation.rootoshes
        .map((rootoshes) => rootoshes.arabic_Name)
        .join(", "),
      status: OrderStatus.Pending,
      paymentStatus: PaymentStatus.Paid,
      invoiceNumber: invoiceNumber,
      comments: [],
      reservation: reservation,
      branch: {
        id: reservation.branch.id, // Include branch ID
        name: reservation.branch.name, // Include branch name
      },
      artist: null,
      createdBy, // Set createdBy field with limited user data

      payment: null, // Assign the Visa payment method to the order
    });

    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          // Save the new order
          const savedOrder = await transactionalEntityManager.save(
            OrderEntity,
            newOrder
          );

          // Update customer's last services list and last rootoshes
          const customer = await transactionalEntityManager.findOne(
            CustomerEntity,
            {
              where: { id: reservation.customer.id },
              relations: ["lastRootoshes"], // Load last services and rootoshes
            }
          );

          if (customer) {
            // Fetch reservation again to get services with their rootoshes
            // const reservationWithServices = await this.reservationRepository.findOne({
            //   where: { id: reservationId },
            //   relations: ["services", "services.rootosh"], // Load services and their rootosh entities
            // });

            const rootoshList = reservation.rootoshes;

            // Remove rootoshes from the customer's last rootoshes
            customer.lastRootoshes = customer.lastRootoshes.filter(
              (lastRootosh) =>
                !rootoshList.some((rootosh) => rootosh.id === lastRootosh.id)
            );
            // Save the updated customer
            await transactionalEntityManager.save(CustomerEntity, customer);
          }

          // Create an audit log entry
          const auditLog = new AuditLogEntity();
          auditLog.tableName = "order";
          auditLog.action = "INSERT";
          auditLog.entityId = savedOrder.id; // ID of the created order
          auditLog.performedBy = userId; // User who created the order

          // Fetch user details if needed
          if (userId) {
            const user = await transactionalEntityManager.findOne(UserEntity, {
              where: { id: userId },
            });
            if (user) {
              auditLog.userDetails = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
              };
            }
          }

          await transactionalEntityManager.save(AuditLogEntity, auditLog);
          // Fetch users with roles 'Branch Manager' and 'Admin'
          const usersToNotify = await transactionalEntityManager.find(
            UserEntity,
            {
              where: [
                { role: Role.BRANCHMANAGER },
                { role: Role.SUPERADMIN },
                { role: Role.ADMIN },
              ],
            }
          );

          // Send notifications to each user
          for (const user of usersToNotify) {
            await this.notificationService.createNotification(
              user.id,
              "new order created",
              `A new order has been created: ${savedOrder.id}`
            );
          }
          return savedOrder;
        }
      );
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        "Failed to create order",
        error.stack
      );
    }
  }
  /* -------------------------------------------------------------------------- */
  /*                    GetOrderByReservationId&CreateRceipt                    */
  /* -------------------------------------------------------------------------- */

  /* -------------------------------------------------------------------------- */
  /*                     UpdateOrderServicesFromReservation                     */
  /* -------------------------------------------------------------------------- */
  async updateOrderServicesFromReservation(
    reservationId: string,
    userId: string
  ): Promise<OrderEntity> {
    const UpdateBy = await this.userRepository.findOne({
      where: { id: userId },
      select: ["id", "username", "email", "role"], // Only return these fields
    });
    if (!UpdateBy) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException("Reservation not found");
    }

    const order = await this.orderRepository.findOne({
      where: { reservation: { id: reservationId } },
    });

    if (!order) {
      throw new NotFoundException("Order not found for this reservation");
    }

    // Update order details based on the updated reservation
    order.serviceEnglish = reservation.services
      .map((service) => service.english_Name)
      .join(", ");
    order.serviceArabic = reservation.services
      .map((service) => service.arabic_Name)
      .join(", ");
    order.updatedBy = UpdateBy;
    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          // Save the updated order
          const updatedOrder = await transactionalEntityManager.save(
            OrderEntity,
            order
          );

          // Create an audit log entry for the order update
          const auditLog = new AuditLogEntity();
          auditLog.tableName = "order";
          auditLog.action = "UPDATE";
          auditLog.entityId = updatedOrder.id; // ID of the updated order
          auditLog.performedBy = userId; // User who updated the order
          // Fetch user details if needed
          if (userId) {
            const user = await transactionalEntityManager.findOne(UserEntity, {
              where: { id: userId },
            });
            if (user) {
              auditLog.userDetails = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
              };
            }
          }
          await transactionalEntityManager.save(AuditLogEntity, auditLog);

          return updatedOrder;
        }
      );
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to update order",
        error.stack
      );
    }
  }

  async updateOrderTimeFromReservation(
    reservationId: string,
    userId: string
  ): Promise<OrderEntity> {
    const UpdateBy = await this.userRepository.findOne({
      where: { id: userId },
      select: ["id", "username", "email", "role"], // Only return these fields
    });
    if (!UpdateBy) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException("Reservation not found");
    }

    const order = await this.orderRepository.findOne({
      where: { reservation: { id: reservationId } },
    });

    if (!order) {
      throw new NotFoundException("Order not found for this reservation");
    }

    order.date = `${reservation.reservationYear}-${reservation.reservationMonth}-${reservation.reservationDay}`;
    order.updatedBy = UpdateBy;
    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          // Save the updated order
          const updatedOrder = await transactionalEntityManager.save(
            OrderEntity,
            order
          );

          // Create an audit log entry for the order update
          const auditLog = new AuditLogEntity();
          auditLog.tableName = "order";
          auditLog.action = "UPDATE";
          auditLog.entityId = updatedOrder.id; // ID of the updated order
          auditLog.performedBy = userId; // User who updated the order
          // Fetch user details if needed
          if (userId) {
            const user = await transactionalEntityManager.findOne(UserEntity, {
              where: { id: userId },
            });
            if (user) {
              auditLog.userDetails = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
              };
            }
          }
          await transactionalEntityManager.save(AuditLogEntity, auditLog);

          return updatedOrder;
        }
      );
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to update order",
        error.stack
      );
    }
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async updatePaymentStatus(
    orderId: string,
    newPaymentStatus:PaymentStatus.Paid | PaymentStatus.PartiallyPaid,
    image: Express.Multer.File,
    userId: string // Optional parameter for the user ID
  ): Promise<OrderEntity> {
    let updatedOrder: OrderEntity;

    try {
      // Fetch the order by ID
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      // Check if the order exists
      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }
      // Prevent changing the status back to "partially paid" if it is currently "paid"
      if (
        newPaymentStatus === PaymentStatus.PartiallyPaid &&
        order.paymentStatus === PaymentStatus.Paid
      ) {
        throw new BadRequestException(
          "Payment status cannot be changed back to 'partially paid' after it has been set to 'paid'."
        );
      }

      // Check if the current payment status allows updating to "paid"
      if (
        newPaymentStatus === PaymentStatus.Paid &&
        order.paymentStatus !== PaymentStatus.PartiallyPaid
      ) {
        throw new BadRequestException(
          "Payment status can only be updated to 'paid' if the current status is 'partially paid'."
        );
      }
      // Check if the new status is 'paid' and ensure the image is provided
      if (newPaymentStatus === PaymentStatus.Paid && !image) {
        throw new BadRequestException(
          "An image is required when updating the payment status to 'paid'."
        );
      }
      // Update the paymentStatus
      order.paymentStatus = newPaymentStatus === "paid" ? PaymentStatus.Paid : PaymentStatus.PartiallyPaid;

      // Update image URL if provided
      if (image) {
        const folderName = "orders-payment-status"; // or any other dynamic name based on context
        const resultImage = await this.CloudinaryService.uploadImage(
          image,
          folderName
        );
        if (resultImage) {
          console.log(`Updating image URL for order ID ${orderId}`);
          order.image_order_payment_status_Url = resultImage.url;
        }
      }

      // Fetch the user who is updating the order
      let updatedByObj = null;
      if (userId) {
        updatedByObj = await this.userRepository.findOne({
          where: { id: userId },
          select: ["id", "username", "email", "role"], // Select only the required fields
        });
        if (!updatedByObj) {
          throw new NotFoundException(`User with ID ${userId} not found`);
        }
        order.updatedBy = updatedByObj;
      }

      // Perform the update within a transaction
      updatedOrder = await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          // Save the updated order
          const savedOrder = await transactionalEntityManager.save(
            OrderEntity,
            order
          );

          // Create an audit log entry
          const auditLog = new AuditLogEntity();
          auditLog.tableName = "order";
          auditLog.action = "UPDATE";
          auditLog.entityId = savedOrder.id; // ID of the updated order

          // Determine changed columns and details
          const changedColumns = [];
          const changesDetails = {};

          // Collect old values from the database
          const oldOrder = await transactionalEntityManager.findOne(
            OrderEntity,
            { where: { id: savedOrder.id } }
          );

          if (oldOrder) {
            Object.keys(order).forEach((key) => {
              if (oldOrder[key] !== order[key]) {
                changedColumns.push(key);
                changesDetails[key] = {
                  oldValue: oldOrder[key],
                  newValue: order[key],
                };
              }
            });
          }

          auditLog.changedColumns = changedColumns;
          auditLog.changesDetails = changesDetails;
          auditLog.performedBy = userId;

          // Fetch user details if needed
          if (userId) {
            const user = await transactionalEntityManager.findOne(UserEntity, {
              where: { id: userId },
            });
            if (user) {
              auditLog.userDetails = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
              };
            }
          }

          await transactionalEntityManager.save(AuditLogEntity, auditLog);

          return savedOrder;
        }
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Re-throw specific not found exception
      } else {
        throw new InternalServerErrorException(
          "Error updating payment status",
          error.stack
        );
      }
    }

    return updatedOrder;
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Method to update the status of an order
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    image: Express.Multer.File,
    userId: string // Optional parameter for the user ID
  ): Promise<any> {
    let order: OrderEntity;

    try {
      // Fetch the order by ID
      order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ["receipts", "reservation", "createdBy", "artist"], // Ensure that the receipts and reservation relations are loaded
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }
    } catch (error) {
      console.error("Error fetching the order:", error);
      if (error instanceof NotFoundException) {
        throw error; // Re-throw specific not found exception
      } else {
        throw new InternalServerErrorException(
          "Error fetching the order",
          error.stack
        );
      }
    }
    // Ensure that an image is provided when canceling the order
    if (newStatus === OrderStatus.Canceled && !image) {
      throw new BadRequestException(
        "An image is required when canceling an order."
      );
    }
    if (newStatus === OrderStatus.Canceled) {
      try {
        if (!order.reservation) {
          throw new NotFoundException(
            `No reservation found for order with ID ${orderId}`
          );
        }
        console.log(order.reservation.id)
        await this.reservationService.deleteReservation(order.reservation.id)
        const deposit = order.reservation.deposit; // Get deposit from the reservation
        let paymentAmount: number;
        order.status = OrderStatus.Canceled;

        if (order.paymentStatus === PaymentStatus.Paid) {
          if (order.receipts.length === 0) {
            throw new NotFoundException(
              `No receipt found for order with ID ${orderId}`
            );
          }
          const receipt = order.receipts[0]; // Assuming you need the first receipt
          paymentAmount = receipt.totalPayment;
        } else if (order.paymentStatus === PaymentStatus.PartiallyPaid) {
          paymentAmount = deposit;
        } else {
          throw new InternalServerErrorException(
            `Invalid payment status: ${order.paymentStatus}`
          );
        }
        await this.orderRepository.save(order);
        return { order, paymentAmount };
      } catch (error) {
        console.error("Error processing payment details:", error);
        if (error instanceof NotFoundException) {
          throw error; // Re-throw specific not found exception
        } else {
          throw new InternalServerErrorException(
            "Error processing payment details",
            error.stack
          );
        }
      }
    }
    // Restrict changes once the status is 'Completed'
    if (
      order.status === OrderStatus.Completed &&
      newStatus !== OrderStatus.Reviewed
    ) {
      throw new BadRequestException(
        "Once an order is 'Completed', it can only be changed to 'Reviewed'."
      );
    }

    // Ensure that only an 'ArtistManager' can update the status to 'Reviewed', and only if the order is 'Completed'
    if (newStatus === OrderStatus.Reviewed) {
      if (order.status !== OrderStatus.Completed) {
        throw new BadRequestException(
          "Order must be 'Completed' before it can be updated to 'Reviewed'."
        );
      }

      // Fetch the user trying to update the status
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Check if the user has the 'ARTISTMANAGER' role
      if (user.role !== "ARTISTMANAGER") {
        throw new BadRequestException(
          "Only employees with the 'ARTISTMANAGER' position can update the order status to 'Reviewed'."
        );
      }
    }

    // Ensure that the artist is assigned before updating the status to 'InQueue'
    if (newStatus === OrderStatus.InQueue && !order.artist) {
      // Check if there is an artist assigned to the order
      if (!order.artist) {
        // Assuming 'artist' is the field that holds the assigned artist
        throw new BadRequestException(
          "An artist must be assigned to the order before updating the status to 'InQueue'."
        );
      }

      // Ensure that payment status is 'paid'
      if (order.paymentStatus !== PaymentStatus.Paid) {
        throw new BadRequestException(
          "Cannot update order status to 'InQueue' unless the payment status is 'paid'."
        );
      }
    }

    // Fetch the user trying to update the status
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if the user has the 'ARTIST' position

    // Ensure that only an employee with the 'ARTIST' position can update the status to 'Working' and the order is already 'InQueue'
    if (newStatus === OrderStatus.Working) {
      // Check if the current order status is 'InQueue'
      if (order.status !== OrderStatus.InQueue) {
        throw new BadRequestException(
          "Order must be in 'InQueue' before it can be updated to 'Working'."
        );
      }

      // Fetch the user trying to update the status
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Check if the user has the 'ARTIST' position
      if (user.role !== "ARTIST") {
        throw new ForbiddenException(
          "Only employees with the 'ARTIST' position can update the order status to 'Working'."
        );
      }
    }

    // Ensure that only an employee with the 'ARTIST' position can update the status to 'Completed' and the order is already 'Working'
    if (newStatus === OrderStatus.Completed) {
      // Check if the current order status is 'Working'
      if (order.status !== OrderStatus.Working) {
        throw new BadRequestException(
          "Order must be in 'Working' before it can be updated to 'Completed'."
        );
      }

      // Check if the user has the 'ARTIST' position
      if (user.role !== "ARTIST") {
        throw new ForbiddenException(
          "Only employees with the 'ARTIST' position can update the order status to 'Completed'."
        );
      }
    }
    // Update the order status
    order.status = newStatus;

    // Upload image
    if (image) {
      const folderName = "orders-status";
      const resultImage = await this.CloudinaryService.uploadImage(
        image,
        folderName
      );
      if (resultImage) {
        order.image_order_status_Url = resultImage.url;
      }
    }

    // Fetch the user who is updating the order
    try {
      const updatedByObj = await this.userRepository.findOne({
        where: { id: userId },
        select: ["id", "username", "email", "role"], // Select only the required fields
      });
      if (!updatedByObj) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      order.updatedBy = updatedByObj;
    } catch (error) {
      console.error("Error fetching user details:", error);
      if (error instanceof NotFoundException) {
        throw error; // Re-throw specific not found exception
      } else {
        throw new InternalServerErrorException(
          "Error fetching user details",
          error.stack
        );
      }
    }

    try {
      // Save the updated order
      const updatedOrder = await this.orderRepository.save(order);

      // Create an audit log entry
      await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          const oldOrder = await transactionalEntityManager.findOne(
            OrderEntity,
            { where: { id: updatedOrder.id } }
          );

          const log = new AuditLogEntity();
          log.tableName = "order";
          log.action = "UPDATE";
          log.entityId = updatedOrder.id;

          const changedColumns = [];
          const changesDetails = {};

          if (oldOrder) {
            Object.keys(updatedOrder).forEach((key) => {
              if (oldOrder[key] !== updatedOrder[key]) {
                changedColumns.push(key);
                changesDetails[key] = {
                  oldValue: oldOrder[key],
                  newValue: updatedOrder[key],
                };
              }
            });
          }

          log.changedColumns = changedColumns;
          log.changesDetails = changesDetails;
          log.performedBy = userId;

          if (userId) {
            const user = await transactionalEntityManager.findOne(UserEntity, {
              where: { id: userId },
            });
            if (user) {
              log.userDetails = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
              };
            }
          }

          await transactionalEntityManager.save(AuditLogEntity, log);
          if (order.status === OrderStatus.Canceled) {
            
            const usersToNotify = await transactionalEntityManager.find(
              UserEntity,
              {
                where: [
                  { role: Role.BRANCHMANAGER },
                  { role: Role.SUPERADMIN },
                  { role: Role.SUPERADMIN },
                ],
              }
            );

            // Send notifications to each user
            for (const user of usersToNotify) {
              await this.notificationService.createNotification(
                user.id,
                " order canceled",
                `A order has been canceled: ${updatedOrder.id} by : ${userId}`
              );
            }



          }
          if (order.status === OrderStatus.Completed) {
            const usersToNotify = await transactionalEntityManager.find(
              UserEntity,
              {
                where: [{ role: Role.ARTISTMANAGER }],
              }
            );

            // Send notifications to each user
            for (const user of usersToNotify) {
              await this.notificationService.createNotification(
                user.id,
                " order completed",
                `A order has been completed: ${updatedOrder.id} by : ${userId}`
              );
            }
          }
        }
      );

      return updatedOrder;
    } catch (error) {
      console.error("Failed to update order status:", error);
      throw new InternalServerErrorException(
        "Failed to update order status",
        error.stack
      );
    }
  }

  // async updateOrderStatus(
  //   orderId: string,
  //   newStatus: OrderStatus,
  //   image: Express.Multer.File,
  //   userId: string // Optional parameter for the user ID
  // ): Promise<OrderEntity | { paymentAmount: number }> {
  //   let order: OrderEntity;

  //   try {
  //     // Fetch the order by ID
  //     order = await this.orderRepository.findOne({
  //       where: { id: orderId },
  //       relations: ["receipts", "reservation"], // Ensure that the receipts and reservation relations are loaded
  //     });

  //     if (!order) {
  //       throw new NotFoundException(`Order with ID ${orderId} not found`);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching the order:", error);
  //     throw new InternalServerErrorException(`Failed to fetch order with ID ${orderId}.`);
  //   }

  //   // Ensure that an image is provided when canceling the order
  //   if (newStatus === OrderStatus.Canceled && !image) {
  //     throw new BadRequestException("An image is required when canceling an order.");
  //   }

  //   if (newStatus === OrderStatus.Canceled) {
  //     try {
  //       if (!order.reservation) {
  //         throw new NotFoundException(`No reservation found for order with ID ${orderId}`);
  //       }

  //       const deposit = order.reservation.deposit; // Get deposit from the reservation
  //       let paymentAmount: number;

  //       if (order.paymentStatus === "paid") {
  //         if (order.receipts.length === 0) {
  //           throw new NotFoundException(`No receipt found for order with ID ${orderId}`);
  //         }

  //         const receipt = order.receipts[0]; // Assuming you need the first receipt
  //         paymentAmount = receipt.totalPayment;
  //       } else if (order.paymentStatus === "partially paid") {
  //         paymentAmount = deposit;
  //       } else {
  //         throw new BadRequestException(`Invalid payment status '${order.paymentStatus}' for order with ID ${orderId}.`);
  //       }

  //       return { paymentAmount };
  //     } catch (error) {
  //       console.error("Error processing payment details:", error);
  //       if (error instanceof NotFoundException || error instanceof BadRequestException) {
  //         throw error; // Re-throw specific exceptions for better handling
  //       }
  //       throw new InternalServerErrorException(`Failed to process payment details for order ID ${orderId}.`);
  //     }
  //   }

  //   // Restrict changes once the status is 'Completed'
  //   if (order.status === OrderStatus.Completed && newStatus !== OrderStatus.Reviewed) {
  //     throw new BadRequestException("Once an order is 'Completed', it can only be changed to 'Reviewed'.");
  //   }

  //   // Ensure that only an 'ArtistManager' can update the status to 'Reviewed', and only if the order is 'Completed'
  //   if (newStatus === OrderStatus.Reviewed) {
  //     if (order.status !== OrderStatus.Completed) {
  //       throw new BadRequestException("Order must be 'Completed' before it can be updated to 'Reviewed'.");
  //     }

  //     const user = await this.userRepository.findOne({
  //       where: { id: userId },
  //       relations: ["position"], // Load the user's position or role
  //     });

  //     if (!user) {
  //       throw new NotFoundException(`User with ID ${userId} not found`);
  //     }

  //     // Check if the user has the 'ARTISTMANAGER' role
  //     if (user.role !== "ARTISTMANAGER") {
  //       throw new ForbiddenException("Only employees with the 'ARTISTMANAGER' position can update the order status to 'Reviewed'.");
  //     }
  //   }

  //   // Ensure that the artist is assigned before updating the status to 'InQueue'
  //   if (newStatus === OrderStatus.InQueue) {
  //     if (!order.artist) {
  //       throw new BadRequestException("An artist must be assigned to the order before updating the status to 'InQueue'.");
  //     }

  //     if (order.paymentStatus !== "paid") {
  //       throw new BadRequestException("Cannot update order status to 'InQueue' unless the payment status is 'paid'.");
  //     }
  //   }

  //   // Fetch the user trying to update the status
  //   const user = await this.userRepository.findOne({
  //     where: { id: userId },
  //   });

  //   if (!user) {
  //     throw new NotFoundException(`User with ID ${userId} not found`);
  //   }

  //   // Ensure that only an employee with the 'ARTIST' position can update the status to 'Working'
  //   if (newStatus === OrderStatus.Working) {
  //     if (order.status !== OrderStatus.InQueue) {
  //       throw new BadRequestException("Order must be in 'InQueue' before it can be updated to 'Working'.");
  //     }

  //     if (user.role !== "ARTIST") {
  //       throw new ForbiddenException("Only employees with the 'ARTIST' position can update the order status to 'Working'.");
  //     }
  //   }

  //   // Ensure that only an employee with the 'ARTIST' position can update the status to 'Completed'
  //   if (newStatus === OrderStatus.Completed) {
  //     if (order.status !== OrderStatus.Working) {
  //       throw new BadRequestException("Order must be in 'Working' before it can be updated to 'Completed'.");
  //     }

  //     if (user.role !== "ARTIST") {
  //       throw new ForbiddenException("Only employees with the 'ARTIST' position can update the order status to 'Completed'.");
  //     }
  //   }

  //   // Update the order status
  //   order.status = newStatus;

  //   // Upload image
  //   if (image) {
  //     try {
  //       const folderName = "orders-status";
  //       const resultImage = await this.CloudinaryService.uploadImage(image, folderName);
  //       if (resultImage) {
  //         order.image_order_status_Url = resultImage.url;
  //       }
  //     } catch (error) {
  //       console.error("Error uploading image:", error);
  //       throw new InternalServerErrorException(`Failed to upload image for order ID ${orderId}.`);
  //     }
  //   }

  //   // Fetch the user who is updating the order
  //   try {
  //     const updatedByObj = await this.userRepository.findOne({
  //       where: { id: userId },
  //       select: ["id", "username", "email", "role"], // Select only the required fields
  //     });

  //     if (!updatedByObj) {
  //       throw new NotFoundException(`User with ID ${userId} not found`);
  //     }
  //     order.updatedBy = updatedByObj;
  //   } catch (error) {
  //     console.error("Error fetching user details:", error);
  //     throw new InternalServerErrorException(`Failed to fetch user details for user ID ${userId}.`);
  //   }

  //   try {
  //     // Save the updated order
  //     const updatedOrder = await this.orderRepository.save(order);

  //     // Create an audit log entry
  //     await this.entityManager.transaction(
  //       async (transactionalEntityManager) => {
  //         const oldOrder = await transactionalEntityManager.findOne(OrderEntity, { where: { id: updatedOrder.id } });

  //         const log = new AuditLogEntity();
  //         log.tableName = "order";
  //         log.action = "UPDATE";
  //         log.entityId = updatedOrder.id;

  //         const changedColumns = [];
  //         const changesDetails = {};

  //         if (oldOrder) {
  //           Object.keys(updatedOrder).forEach((key) => {
  //             if (oldOrder[key] !== updatedOrder[key]) {
  //               changedColumns.push(key);
  //               changesDetails[key] = {
  //                 oldValue: oldOrder[key],
  //                 newValue: updatedOrder[key],
  //               };
  //             }
  //           });
  //         }

  //         log.changedColumns = changedColumns;
  //         log.changesDetails = changesDetails;
  //         log.performedBy = userId;

  //         if (userId) {
  //           const user = await transactionalEntityManager.findOne(UserEntity, { where: { id: userId } });
  //           if (user) {
  //             log.userDetails = {
  //               id: user.id,
  //               username: user.username,
  //               email: user.email,
  //               role: user.role,
  //             };
  //           }
  //         }

  //         await transactionalEntityManager.save(AuditLogEntity, log);

  //         if (order.status === OrderStatus.Canceled) {
  //           const usersToNotify = await transactionalEntityManager.find(UserEntity, {
  //             where: [
  //               { role: Role.BRANCHMANAGER },
  //               { role: Role.SUPERADMIN },
  //             ],
  //           });

  //           // Send notifications to each user
  //           for (const user of usersToNotify) {
  //             await this.notificationService.createNotification(
  //               user.id,
  //               "order canceled",
  //               `An order has been canceled: ${updatedOrder.id} by: ${userId}`
  //             );
  //           }
  //         }

  //         if (order.status === OrderStatus.Completed) {
  //           const usersToNotify = await transactionalEntityManager.find(UserEntity, {
  //             where: { role: Role.ARTISTMANAGER },
  //           });

  //           // Send notifications to each user
  //           for (const user of usersToNotify) {
  //             await this.notificationService.createNotification(
  //               user.id,
  //               "order completed",
  //               `An order has been completed: ${updatedOrder.id} by: ${userId}`
  //             );
  //           }
  //         }
  //       }
  //     );

  //     return updatedOrder;
  //   } catch (error) {
  //     console.error("Error updating order status:", error);

  //     // Return different responses based on the type of error
  //     if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
  //       throw error; // Re-throw specific exceptions for better handling
  //     } else {
  //       throw new InternalServerErrorException(`Failed to update order status for order ID ${orderId}.`);
  //     }
  //   }
  // }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async assignOrderToArtist(
    orderId: string,
    artistId: string,
    userId: string // Include userId for logging
  ): Promise<OrderEntity> {
    let order: OrderEntity;
    let artist: EmployeeEntity;

    try {
      // Fetch the order
      order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // Fetch the artist with their position
      artist = await this.employeeRepository.findOne({
        where: { id: artistId },
        relations: ["position"], // Ensure position is included
      });

      if (!artist) {
        throw new NotFoundException(`Artist with ID ${artistId} not found`);
      }

      // Verify if the employee's position is "Artist"
      if (artist.position.postion !== Postion.ARTIST) {
        throw new NotFoundException(
          `Employee with ID ${artistId} does not have the position of Artist`
        );
      }

      // Check if the order date matches today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time part to compare only date

      const orderDate = new Date(order.date); // Assuming 'order.date' contains the order date
      orderDate.setHours(0, 0, 0, 0); // Reset time part to compare only date

      if (orderDate.getTime() !== today.getTime()) {
        throw new BadRequestException(
          `Order date ${orderDate.toDateString()} does not match today's date`
        );
      }

      // Map the artist entity to ArtistDto
      const artistDto: ArtistDto = {
        id: artist.id,
        username: artist.username,
        email: artist.email,
        role: artist.role,
        englishName: artist.english_Name,
        arabicName: artist.arabic_Name,
        workingHours: artist.workingHours,
        phoneNumber: artist.phoneNumber,
        image: artist.image,
        oldestAvgRating: artist.oldestAvgRating,
        newestAvgRating: artist.newestAvgRating,
        position: artist.position.postion,
      };
      // Ensure that payment status is 'paid'
      if (order.paymentStatus !== PaymentStatus.Paid) {
        throw new BadRequestException(
          "Cannot update order status to 'InQueue' OR assign Artist unless the payment status is 'paid'."
        );
      }
      // Assign the DTO to the order
      order.artist = artistDto as any; // Type assertion to bypass TypeScript checks
      order.status = OrderStatus.InQueue;
      // Save the updated order
      const updatedOrder = await this.orderRepository.save(order);
      // Send notification to the artist
      const notificationTitle = "New Order Assigned";
      const notificationMessage = `You have been assigned a new order with ID ${orderId}.`;
      await this.notificationService.createNotification(
        artist.id,
        notificationTitle,
        notificationMessage
      );

      // Create an audit log entry
      await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          // Find the old order for comparison
          const oldOrder = await transactionalEntityManager.findOne(
            OrderEntity,
            { where: { id: updatedOrder.id } }
          );

          const log = new AuditLogEntity();
          log.tableName = "order";
          log.action = "UPDATE";
          log.entityId = updatedOrder.id;

          const changedColumns = [];
          const changesDetails = {};

          if (oldOrder) {
            Object.keys(updatedOrder).forEach((key) => {
              if (oldOrder[key] !== updatedOrder[key]) {
                changedColumns.push(key);
                changesDetails[key] = {
                  oldValue: oldOrder[key],
                  newValue: updatedOrder[key],
                };
              }
            });
          }

          log.changedColumns = changedColumns;
          log.changesDetails = changesDetails;

          // Fetch user details
          const user = await transactionalEntityManager.findOne(UserEntity, {
            where: { id: userId },
            select: ["id", "username", "email", "role"],
          });

          if (user) {
            log.performedBy = user.id;
            log.userDetails = {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
            };
          } else {
            log.performedBy = null;
          }

          await transactionalEntityManager.save(AuditLogEntity, log);
        }
      );

      return updatedOrder;
    } catch (error) {
      console.error("Failed to assign order to artist:", error);
      throw new InternalServerErrorException(
        "Failed to assign order to artist",
        error.stack
      );
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async findAllOrders(
    findOrdersDto: FindOrdersDto,
    userId: string
  ): Promise<{ items: OrderEntity[]; total: number }> {
    const {
      page,
      limit,
      sort,
      employeeName,
      fromDate,
      toDate,
      paymentStatus,
      orderStatus, // This is now an array
      serviceId,
      customerId,
    } = findOrdersDto;
  
    let branchId = findOrdersDto.branchId;
  
    try {
      const employee = await this.employeeRepository.findOne({
        where: { id: userId },
        relations: ["branch"],
      });
  
      if (
        employee &&
        (employee.role === Role.RECEPTIONIST ||
          employee.role === Role.ARTISTMANAGER) &&
        employee.branch
      ) {
        branchId = employee.branch.id;
      }
  
      const query = this.orderRepository
        .createQueryBuilder("o")
        .leftJoinAndSelect("o.artist", "a")
        .leftJoinAndSelect("o.customer", "c")
        .addSelect(["c.id", "c.fullName", "c.phoneNumber"])
        .leftJoin("o.createdBy", "cb")
        .addSelect(["cb.id", "cb.username", "cb.email", "cb.role"])
        .leftJoin("o.updatedBy", "ub")
        .addSelect(["ub.id", "ub.username"])
        .leftJoinAndSelect("o.reservation", "r")
        .leftJoinAndSelect("r.services", "s")
        .addSelect(["r.id", "r.start_Time", "r.end_Time", "r.totalPrice"])
        .take(limit)
        .skip((page - 1) * limit)
        .orderBy(`o.date`, sort.toUpperCase() as "ASC" | "DESC");
  
      if (employeeName) {
        query.andWhere("a.english_Name ILIKE :employeeName", {
          employeeName: `%${employeeName}%`,
        });
      }
  
      if (branchId) {
        query.andWhere("CAST(o.branch ->> 'id' AS uuid) = :branchId", {
          branchId,
        });
      }
  
      if (fromDate || toDate) {
        if (fromDate) {
          query.andWhere("o.date >= :fromDate", {
            fromDate: new Date(fromDate).toISOString(),
          });
        }
        if (toDate) {
          query.andWhere("o.date < :toDate", {
            toDate: new Date(toDate).toISOString(),
          });
        }
      }
  
      if (paymentStatus) {
        query.andWhere("o.paymentStatus = :paymentStatus", { paymentStatus });
      }
  
      // Handle multiple order statuses
      if (orderStatus && orderStatus.length > 0) {
        query.andWhere("o.status IN (:...orderStatus)", { orderStatus });
      }
  
      if (serviceId) {
        query.andWhere("s.id = :serviceId", { serviceId });
      }
  
      if (customerId) {
        query.andWhere("c.id = :customerId", { customerId });
      }
  
      const [items, total] = await query.getManyAndCount();
  
      return { items, total };
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw new Error("Unable to fetch orders.");
    }
  }
  

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Method to get the count of each order status
  async getOrderStatusCount(
    branchId?: string,
    fromDate?: string,
    toDate?: string,
    employeeId?: string // Add employeeId as a parameter
  ): Promise<any> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder("order")
      .innerJoin("order.reservation", "reservation")
      .leftJoin("order.artist", "employee") // Ensure you're using the correct relation name
      .select("order.status", "status")
      .addSelect("COUNT(order.id)", "count")
      .groupBy("order.status");

    // Conditionally add the where clause based on branchId, fromDate, toDate, and employeeId
    if (branchId) {
      queryBuilder.andWhere("reservation.branchId = :branchId", { branchId });
    }

    if (fromDate) {
      const startOfDay = new Date(fromDate);
      startOfDay.setHours(0, 0, 0, 0); // Set time to 00:00:00
      queryBuilder.andWhere("reservation.start_Time >= :fromDate", {
        fromDate: startOfDay,
      });
    }

    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999); // Set time to 23:59:59
      queryBuilder.andWhere("reservation.start_Time <= :toDate", {
        toDate: endOfDay,
      });
    }

    if (employeeId) {
      queryBuilder.andWhere("employee.id = :employeeId", { employeeId }); // Filter by employee ID
    }

    const orders = await queryBuilder.getRawMany();

    // Initialize the status count object with all possible statuses
    const orderStatusCounts: { [key in OrderStatus]: number } = {
      [OrderStatus.Pending]: 0,
      [OrderStatus.InQueue]: 0,
      [OrderStatus.Working]: 0,
      [OrderStatus.Reviewed]: 0,
      [OrderStatus.Completed]: 0,
      [OrderStatus.Canceled]: 0,
    };

    // Populate the orderStatusCounts object with the results from the query
    orders.forEach((order) => {
      orderStatusCounts[order.status] = parseInt(order.count, 10);
    });

    return orderStatusCounts;
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Method to get the count of each order status
  async getOrderStatusCountByArtist(
    userId: string, // User ID from the token
    fromDate?: string,
    toDate?: string
  ): Promise<{ [key in OrderStatus]: number }> {
    // Fetch the employee (artist) associated with the userId to get the branchId
    const employee = await this.employeeRepository.findOne({
      where: { id: userId },
      relations: ["branch"], // Ensure to include the relation to branch
    });

    if (!employee || !employee.branch) {
      throw new BadRequestException("Employee or branch not found");
    }

    const branchId = employee.branch.id; // Get the branchId from the employee

    const queryBuilder = this.orderRepository
      .createQueryBuilder("order")
      .innerJoin("order.reservation", "reservation")
      .leftJoin("order.artist", "employee") // Ensure you're using the correct relation name
      .select("order.status", "status")
      .addSelect("COUNT(order.id)", "count")
      .groupBy("order.status");

    // Add the where clause based on branchId and optional date range
    queryBuilder.andWhere("reservation.branchId = :branchId", { branchId });

    if (fromDate) {
      const startOfDay = new Date(fromDate);
      startOfDay.setHours(0, 0, 0, 0); // Set time to 00:00:00
      queryBuilder.andWhere("reservation.start_Time >= :fromDate", {
        fromDate: startOfDay,
      });
    }

    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999); // Set time to 23:59:59
      queryBuilder.andWhere("reservation.start_Time <= :toDate", {
        toDate: endOfDay,
      });
    }

    // Add a condition to filter by employeeId (userId)
    queryBuilder.andWhere("employee.id = :userId", { userId }); // Filter by user ID (employee)

    const orders = await queryBuilder.getRawMany();

    // Initialize the status count object with all possible statuses
    const orderStatusCounts: { [key in OrderStatus]: number } = {
      [OrderStatus.Pending]: 0,
      [OrderStatus.InQueue]: 0,
      [OrderStatus.Working]: 0,
      [OrderStatus.Reviewed]: 0,
      [OrderStatus.Completed]: 0,
      [OrderStatus.Canceled]: 0,
    };

    // Populate the orderStatusCounts object with the results from the query
    orders.forEach((order) => {
      orderStatusCounts[order.status] = parseInt(order.count, 10);
    });

    return orderStatusCounts;
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async findOrdersByEmployeeAndDay(
    userId: string,
    findOrdersByDayDto: FindOrdersByDayDto
  ): Promise<{ items: any[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sort = "ASC",
      fromDate,
      toDate,
      orderStatus,
    } = findOrdersByDayDto;
  
    try {
      // Fetch the employee by userId, including relations
      const employee = await this.employeeRepository.findOne({
        where: { id: userId },
        relations: [
          "orders",
          "orders.customer",
          "orders.payment",
          "orders.artist",
          "orders.reservation",
          "orders.reservation.services",
          "branch",
        ],
      });
  
      if (!employee) {
        throw new NotFoundException(`Employee with userId ${userId} not found`);
      }
  
      // Handle date filtering (fromDate and toDate)
      const fromDateObj = fromDate ? new Date(fromDate) : null;
      const toDateObj = toDate ? new Date(toDate) : null;
  
      if (fromDateObj) {
        fromDateObj.setHours(0, 0, 0, 0);
      }
      if (toDateObj) {
        toDateObj.setHours(23, 59, 59, 999);
      }
  
      const filteredOrders = employee.orders.filter((order) => {
        const orderDate = new Date(order.date);
  
        // Apply date filters
        if (fromDateObj && orderDate < fromDateObj) {
          return false;
        }
        if (toDateObj && orderDate > toDateObj) {
          return false;
        }
  
        // Apply orderStatus filter if provided
        if (orderStatus && !orderStatus.includes(order.status)) {
          return false;
        }
  
        return true;
      });
  
      // Apply sorting based on sort direction
      const sortedOrders = filteredOrders.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        return sort === "ASC"
          ? dateA.getTime() - dateB.getTime() // Oldest first
          : dateB.getTime() - dateA.getTime(); // Most recent first
      });
  
      // Apply pagination
      const paginatedOrders = sortedOrders.slice(
        (page - 1) * limit,
        page * limit
      );
  
      // Map orders to include all necessary details
      const mappedOrders = paginatedOrders.map((order) => ({
        id: order.id,
        date: order.date.toString(),
        serviceEnglish: order.serviceEnglish,
        serviceArabic: order.serviceArabic,
        invoiceNumber: order.invoiceNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        image_order_status_Url: order.image_order_status_Url,
        image_order_payment_status_Url: order.image_order_payment_status_Url,
        offerId: order.offerId,
        sharableOfferId: order.sharableOfferId,
        couponId: order.couponId,
        artist: order.artist ? {
          id: order.artist.id,
          username: order.artist.username,
          email: order.artist.email,
          role: order.artist.role,
          english_Name: order.artist.english_Name,
          arabic_Name: order.artist.arabic_Name,
          image: order.artist.image,
          available: order.artist.available,
          totalReviews: order.artist.totalReviews,
          status: order.artist.status,
          oldestAvgRating: order.artist.oldestAvgRating,
          newestAvgRating: order.artist.newestAvgRating,
        } : null,
        payment: order.payment ? {
          id: order.payment.id,
          methodEnglish: order.payment.methodEnglish,
          methodArabic: order.payment.methodArabic,
          image: order.payment.image,
          createdAt: order.payment.createdAt.toISOString(),
        } : null,
        customer: order.customer ? {
          id: order.customer.id,
          country_Code: order.customer.country_Code,
          phoneNumber: order.customer.phoneNumber,
          fullName: order.customer.fullName,
          dateOfBirth: order.customer.dateOfBirth,
        } : null,
        branch: employee.branch ? {
          id: employee.branch.id,
          name: employee.branch.name,
        } : null,
        reservation: order.reservation ? {
          id: order.reservation.id,
          reservationDay: order.reservation.reservationDay,
          reservationMonth: order.reservation.reservationMonth,
          reservationYear: order.reservation.reservationYear,
          start_Time: order.reservation.start_Time,
          end_Time: order.reservation.end_Time,
          totalPrice: order.reservation.totalPrice,
          deposit: order.reservation.deposit,
          services: order.reservation.services.map(service => ({
            id: service.id,
            arabic_Name: service.arabic_Name,
            english_Name: service.english_Name,
            duration_Mins: service.duration_Mins,
            rootosh_Number: service.rootosh_Number,
            months_To_Expire: service.months_To_Expire,
          })),
        } : null,
      }));
  
      // Return paginated result
      return { items: mappedOrders, total: filteredOrders.length };
    } catch (error) {
      console.error("Failed to retrieve orders for employee:", error);
      throw new InternalServerErrorException(
        "Failed to retrieve orders for employee",
        error.stack
      );
    }
  }
  
  
  

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async findOrderById(orderId: string): Promise<OrderEntity | null> {
    try {
      return await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ["receipts", "reservation", "createdBy", "artist"], // Add relations if needed
      });
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to retrieve the order",
        error.stack
      );
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async updatePaymentForOrder(
    orderId: string,
    paymentId: string
  ): Promise<OrderEntity> {
    try {
      // Find the order by ID
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ["payment"], // Load relations if necessary
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // Find the payment by ID
      const payment = await this.PaymentRepository.findOne({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new NotFoundException(`Payment with ID ${paymentId} not found`);
      }

      // Update the order with the new payment
      order.payment = payment;

      // Save the updated order
      return await this.orderRepository.save(order);
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to update payment for order",
        error.stack
      );
    }
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async getTopArtistsByOrders(branchId?: string) {
    // Find the position ID for the "ARTIST" role
    const artistPosition = await this.PositionRepository.findOne({
      where: { postion: Postion.ARTIST },
    });

    if (!artistPosition) {
      throw new NotFoundException("Artist position not found");
    }

    // Create the base query for employees with the position 'ARTIST'
    const query = this.employeeRepository
      .createQueryBuilder("employee")
      .leftJoin("employee.orders", "order")
      .where("employee.positionId = :positionId", {
        positionId: artistPosition.id,
      })
      .select("employee.id", "employeeId")
      .addSelect("employee.english_Name", "englishName")
      .addSelect("employee.arabic_Name", "arabicName")
      .addSelect("employee.email", "email") // Add email
      .addSelect("employee.role", "role") // Add role
      .addSelect("employee.branchId", "branchId") // Add branchId
      .addSelect("COUNT(order.id)", "orderCount") // Count the number of orders
      .groupBy("employee.id")
      .addGroupBy("employee.email") // Ensure email is included in group by
      .addGroupBy("employee.role") // Ensure role is included in group by
      .addGroupBy("employee.branchId") // Ensure branchId is included in group by
      .orderBy("COUNT(order.id)", "DESC") // Sort by the number of orders
      .limit(5); // Limit to top 5 employees

    // If a branchId is provided, filter employees by that branch
    if (branchId) {
      query.andWhere("employee.branchId = :branchId", { branchId });
    }

    // Log the generated SQL query for debugging
    // console.log(query.getSql());

    // Execute the query and return the results
    const result = await query.getRawMany();

    // Return the mapped results with the required fields
    return result.map((item) => ({
      employeeId: item.employeeId,
      englishName: item.englishName,
      arabicName: item.arabicName,
      email: item.email,
      role: item.role,
      branchId: item.branchId,
      orderCount: item.orderCount ? parseInt(item.orderCount, 10) : 0, // Parse order count as a number, default to 0 if null
    }));
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async getOrderCount(branchId?: string): Promise<number> {
    const queryBuilder = this.orderRepository.createQueryBuilder("order");

    if (branchId) {
      queryBuilder.where("order.branch->>id = :branchId", { branchId });
    }

    const count = await queryBuilder.getCount();
    return count;
  }

  async getOrderStatusCountForArtist(
    userId: string,
    branchId?: string,
    artistId?: string // Optional artistId parameter for ADMIN role
  ): Promise<{ [key in OrderStatus]: number }> {
    // Initialize the result object with all order statuses set to zero
    const orderStatusCounts: { [key in OrderStatus]: number } = {
      [OrderStatus.Pending]: 0,
      [OrderStatus.InQueue]: 0,
      [OrderStatus.Working]: 0,
      [OrderStatus.Reviewed]: 0,
      [OrderStatus.Completed]: 0,
      [OrderStatus.Canceled]: 0,
    };

    // Retrieve the user based on userId
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Determine the artistId based on the user's role
    const effectiveArtistId = user.role === Role.ARTIST ? user.id : artistId;

    if (!effectiveArtistId) {
      throw new BadRequestException(
        "Artist ID must be provided for ADMIN role or user must be an ARTIST."
      );
    }

    // Query the repository to get counts based on artistId and optional branchId
    const ordersQuery = this.orderRepository
      .createQueryBuilder("order")
      .select("order.status", "order_status") // Aliasing here
      .addSelect("COUNT(order.id)", "count")
      .where("order.artistId = :artistId", { artistId: effectiveArtistId });

    if (branchId) {
      ordersQuery.andWhere("order.branchId = :branchId", { branchId });
    }

    // Group by order status
    ordersQuery.groupBy("order.status");

    const results = await ordersQuery.getRawMany();
    // console.log('Query Results:', results); // Log the results for debugging

    // Populate the count object based on the results
    for (const result of results) {
      const status = result.order_status as OrderStatus; // Use 'order_status' to match the query result
      if (OrderStatus[status]) {
        orderStatusCounts[status] = parseInt(result.count, 10);
      } else {
        console.warn(`Unexpected order status: ${status}`); // Log unexpected statuses
      }
    }

    return orderStatusCounts;
  }
}
