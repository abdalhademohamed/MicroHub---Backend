import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CreateReceiptDto } from "./dto/create.receipt.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { ReceiptEntity } from "./entities/receipt.entity";
import { Repository } from "typeorm";
import { OrderEntity } from "../orders/entities/order.entity";
import { UserEntity } from "../user/entities/user.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { OfferEntity } from "../offer/entities/offer.entity";
import { CreateReceiptFromReservationIdDto } from "./dto/create.receipt.from.reservationId.dto";
import { GetReceiptsDto } from "./dto/get-receipts.dto";
import { CustomI18nService } from "../common/custom.18n.service";
import { SharableOfferEntity } from "../sharable-offer/entities/sharable-offer.entity";

@Injectable()
export class ReceiptService {
  constructor(
    @InjectRepository(ReceiptEntity)
    private readonly receiptRepository: Repository<ReceiptEntity>,

    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(AuditLogEntity)
    private readonly AuditLogRepository: Repository<AuditLogEntity>,

    @InjectRepository(OfferEntity)
    private readonly OfferRepository: Repository<OfferEntity>,

    private readonly i18n: CustomI18nService,

    @InjectRepository(SharableOfferEntity)
    private readonly sharableOfferRepository: Repository<SharableOfferEntity>
  ) {}

  async createReceipt(
    createReceiptDto: CreateReceiptDto,
    userId: string
  ): Promise<ReceiptEntity> {
    const { orderId, message } = createReceiptDto;

    try {
      let offer = null;
      let services = [];
      let discountPercentage = 0;
      // Fetch the user who created the receipt
      const createdBy = await this.userRepository.findOne({
        where: { id: userId },
        select: ["id", "username", "email", "role"], // Select only required fields
      });
      if (!createdBy) {
        throw new NotFoundException(
          this.i18n.translate("test.RECEIPT.USER_NOT_FOUND", {
            args: { userId },
          })
        );
      }

      // Fetch the order and related reservation and services
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: [
          "reservation",
          "reservation.services",
          "reservation.rootoshes",
        ],
      });

      if (!order) {
        throw new NotFoundException(
          this.i18n.translate("test.RECEIPT.ORDER_NOT_FOUND")
        );
      }

      const reservation = order.reservation;
      if (!reservation) {
        throw new NotFoundException(
          `Reservation not found for Order ID ${order.id}`
        );
      }

      if(order.sharableOfferId){
        const sharableOffer = await this.sharableOfferRepository.findOne({
          where: { id: order.sharableOfferId },
          relations: ['services']
        });
        services=sharableOffer.services
      }else{
        services=reservation.services
      }
      const rootoshes = reservation.rootoshes;
      // }  // Determine the formatted services/rootoshes for the receipt
      let formattedPaymentForServices = [];
      let formattedPaymentForRootoshes = [];
      // Declare the offer variable outside the if block
      if (services && services.length > 0) {
        if (order.couponId) {
          // For coupon services, price is 0
          formattedPaymentForServices = services.map((service) => ({
            name: service.english_Name,
            duration: service.duration_Mins,
            price: "0", // Price is 0 for coupon services
          }));
        } else {
          // For regular services and sharable offer services
          formattedPaymentForServices = services.map((service) => ({
            name: service.english_Name,
            duration: service.duration_Mins,
            price: service.price.toString(),
          }));
        }
      } else if (rootoshes && rootoshes.length > 0) {
        formattedPaymentForRootoshes = rootoshes.map((rootosh) => ({
          name: rootosh.english_Name,
          duration: rootosh.duration_Mins,
          price: 0,
        }));
      } else {
        throw new NotFoundException(
          "No services or rootoshes found for the reservation"
        );
      }

      // If rootoshes exist, set total payment and remaining to zero
      let totalPayment = 0;
      let remaining = 0;

      if (rootoshes && rootoshes.length > 0) {
        // Total payment is zero if there are rootoshes
        totalPayment = 0;
        remaining = 0;
      } else {
        // Calculate total payment from services if no rootoshes
        const totalServicePrice = services.reduce(
          (acc, service) => acc + service.price,
          0
        );
        totalPayment = totalServicePrice;

        // Fetch the offer if offerId exists
        if (order.offerId) {
          offer = await this.OfferRepository.findOne({
            where: { id: order.offerId },
          });
          if (!offer) {
            // If the offer is not found, set it to null
            offer = null;
          }
        }

        if (order.sharableOfferId) {
          offer = await this.OfferRepository.findOne({
            where: { id: order.sharableOfferId },
          });
          if (!offer) {
            // If the offer is not found, set it to null
            offer = null;
          }
        }

        totalPayment = reservation.totalPrice;
        let discountPayment = totalPayment; // Default to totalPayment

        // Apply discount if offer exists
        discountPercentage = offer ? offer.discountPercentage : 0; // Set discount to 0 if no offer
        discountPayment -= totalPayment * (discountPercentage / 100);
        remaining = discountPayment - reservation.deposit;
      }

      // Format the reservation time slot as "startTime-endTime"
      const startTime = new Date(reservation.start_Time).toLocaleTimeString(
        "en-GB",
        { hour: "2-digit", minute: "2-digit" }
      );
      const endTime = new Date(reservation.end_Time).toLocaleTimeString(
        "en-GB",
        { hour: "2-digit", minute: "2-digit" }
      );
      const reservationTimeSlot = `${startTime}-${endTime}`;

      // Combine payment information for the receipt
      const paymentForServicesAndRootoshes = [
        ...formattedPaymentForServices,
        ...formattedPaymentForRootoshes,
      ];
      // Create and save the receipt
      const receipt = this.receiptRepository.create({
        order,
        reservationTimeSlot,
        message,
        totalPayment,
        paymentForServices: paymentForServicesAndRootoshes,
        discount: discountPercentage, // Set discount value
        remaining,
        createdBy,
      });

      const savedReceipt = await this.receiptRepository.save(receipt);

      await this.saveAuditLogForCreate(savedReceipt, userId);

      return savedReceipt;
    } catch (error) {
      console.error("Error creating receipt:", error); // Log the error
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        this.i18n.translate("test.RECEIPT.CREATE_FAILED")
      );
    }
  }
  // Save the audit log for the create action
  private async saveAuditLogForCreate(receipt: ReceiptEntity, userId: string) {
    const auditLog = new AuditLogEntity();
    auditLog.tableName = "Receipt"; // Specify the table name
    auditLog.action = "CREATE"; // Specify the action type
    auditLog.entityId = receipt.id; // ID of the created receipt
    auditLog.performedBy = userId; // ID of the user who performed the action

    // Fetch user details for audit log (optional)
    const userDetails = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (userDetails) {
      auditLog.userDetails = userDetails; // Optional: Add user details for further tracking
    }

    await this.AuditLogRepository.save(auditLog);
  }

  async createReceiptFromReservationId(
    CreateReceiptFromReservationIdDto: CreateReceiptFromReservationIdDto,
    userId: string
  ): Promise<ReceiptEntity> {
    const { reservationId, message } = CreateReceiptFromReservationIdDto;
    try {
      let offer = null;
      let discountPercentage = 0;
      let services = [];
      // Fetch the user who created the receipt
      const createdBy = await this.userRepository.findOne({
        where: { id: userId },
        select: ["id", "username", "email", "role"],
      });
      if (!createdBy) {
        throw new NotFoundException(
          this.i18n.translate("test.RECEIPT.USER_NOT_FOUND", {
            args: { userId },
          })
        );
      }

      // Fetch the order and related reservation and services
      const order = await this.orderRepository.findOne({
        where: { reservation: { id: reservationId } },
        relations: [
          "reservation",
          "reservation.services",
          "reservation.rootoshes",
        ],
      });

      if (!order) {
        throw new NotFoundException(
          this.i18n.translate("test.RECEIPT.ORDER_NOT_FOUND")
        );
      }

      const reservation = order.reservation;
      if (!reservation) {
        throw new NotFoundException(
          this.i18n.translate("test.RECEIPT.RESERVATION_NOT_FOUND", {
            args: { reservationId },
          })
        );
      }

     
      if(order.sharableOfferId){
        const sharableOffer = await this.sharableOfferRepository.findOne({
          where: { id: order.sharableOfferId },
          relations: ['services']
        });
        services=sharableOffer.services
      }else{
        services=reservation.services
      }
      const rootoshes = reservation.rootoshes;

      let formattedPaymentForServices = [];
      let formattedPaymentForRootoshes = [];

      if (services && services.length > 0) {
        if (order.couponId) {
          // For coupon services, price is 0
          formattedPaymentForServices = services.map((service) => ({
            name: service.english_Name,
            duration: service.duration_Mins,
            price: "0", // Price is 0 for coupon services
          }));
        } else {
          // For regular services and sharable offer services
          formattedPaymentForServices = services.map((service) => ({
            name: service.english_Name,
            duration: service.duration_Mins,
            price: service.price.toString(),
          }));
        }
      } else if (rootoshes && rootoshes.length > 0) {
        formattedPaymentForRootoshes = rootoshes.map((rootosh) => ({
          name: rootosh.english_Name,
          duration: rootosh.duration_Mins,
          price: 0,
        }));
      } else {
        throw new NotFoundException(
          "No services or rootoshes found for the reservation"
        );
      }

      let totalPayment = 0;
      let remaining = 0;

      // Handle coupon logic: If couponId exists, set payment values to 0
      if (order.couponId) {
        totalPayment = 0;
        discountPercentage = 0;
        remaining = 0;
      } else if (rootoshes && rootoshes.length > 0) {
        // If rootoshes exist, set total payment and remaining to zero
        totalPayment = 0;
        remaining = 0;
      } else {
        // Calculate total payment from services if no rootoshes and no coupon
        const totalServicePrice = services.reduce(
          (acc, service) => acc + service.price,
          0
        );
        totalPayment = totalServicePrice;

        // Fetch the offer if offerId exists
        if (order.offerId) {
          offer = await this.OfferRepository.findOne({
            where: { id: order.offerId },
          });
          if (!offer) {
            offer = null;
          }
        }

        if (order.sharableOfferId) {
          offer = await this.OfferRepository.findOne({
            where: { id: order.sharableOfferId },
          });
          if (!offer) {
            offer = null;
          }
        }

        totalPayment = reservation.totalPrice;
        let discountPayment = totalPayment; // Default to totalPayment

        // Apply discount if offer exists
        discountPercentage = offer ? offer.discountPercentage : 0; // Set discount to 0 if no offer
        discountPayment -= totalPayment * (discountPercentage / 100);
        remaining = discountPayment - reservation.deposit;
      }

      // Format the reservation time slot as "startTime-endTime"
      const startTime = new Date(reservation.start_Time).toLocaleTimeString(
        "en-GB",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
      const endTime = new Date(reservation.end_Time).toLocaleTimeString(
        "en-GB",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
      const reservationTimeSlot = `${startTime}-${endTime}`;

      // Combine payment information for the receipt
      const paymentForServicesAndRootoshes = [
        ...formattedPaymentForServices,
        ...formattedPaymentForRootoshes,
      ];

      // Create and save the receipt
      const receipt = this.receiptRepository.create({
        order,
        reservationTimeSlot,
        message,
        totalPayment,
        paymentForServices: paymentForServicesAndRootoshes,
        discount: discountPercentage,
        remaining,
        createdBy,
      });

      const savedReceipt = await this.receiptRepository.save(receipt);

      // Log the creation action in the audit log
      await this.saveAuditLogForCreateReceiptFromReservationId(
        savedReceipt,
        userId
      );

      return savedReceipt;
    } catch (error) {
      console.error("Error creating receipt:", error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        this.i18n.translate("test.RECEIPT.CREATE_FAILED")
      );
    }
  }

  // Save the audit log for the create action
  private async saveAuditLogForCreateReceiptFromReservationId(
    receipt: ReceiptEntity,
    userId: string
  ) {
    const auditLog = new AuditLogEntity();
    auditLog.tableName = "Receipt"; // Specify the table name
    auditLog.action = "CREATE"; // Specify the action type
    auditLog.entityId = receipt.id; // ID of the created receipt
    auditLog.performedBy = userId; // ID of the user who performed the action

    // Fetch user details for audit log (optional)
    const userDetails = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (userDetails) {
      auditLog.userDetails = userDetails; // Optional: Add user details for further tracking
    }

    // Save the audit log to the audit log repository
    await this.AuditLogRepository.save(auditLog);
  }

  async getReceiptByOrderId(orderId: string): Promise<ReceiptEntity> {
    const receipt = await this.receiptRepository.findOne({
      where: { 
        order: { id: orderId },
        isRefunded: false  // Add this condition
      },
    });

    if (!receipt) {
      throw new NotFoundException(
        this.i18n.translate("test.RECEIPT.NOT_FOUND_FOR_ORDER", {
          args: { orderId },
        })
      );
    }

    return receipt;
  }

  async getReceiptByReservationId(reservationId: string): Promise<ReceiptEntity> {
    const order = await this.orderRepository.findOne({
      where: { reservation: { id: reservationId } },
      relations: [
        "reservation",
        "reservation.services",
        "reservation.rootoshes",
      ],
    });

    if (!order) {
      throw new NotFoundException(
        this.i18n.translate("test.RECEIPT.ORDER_NOT_FOUND_FOR_RESERVATION", {
          args: { reservationId },
        })
      );
    }

    const receipt = await this.receiptRepository.findOne({
      where: { 
        order: { id: order.id },
        isRefunded: false  // Add this condition
      },
    });

    if (!receipt) {
      throw new NotFoundException(
        this.i18n.translate("test.RECEIPT.NOT_FOUND_FOR_ORDER", {
          args: { orderId: order.id },
        })
      );
    }

    return receipt;
  }

  async getReceipts(getReceiptsDto: GetReceiptsDto) {
    const { fromDate, toDate, page, limit, sort, branchId } = getReceiptsDto;

    const query = this.receiptRepository
      .createQueryBuilder("receipt")
      .leftJoinAndSelect("receipt.order", "order")
      .leftJoinAndSelect("order.payment", "payment")
      .leftJoinAndSelect("receipt.createdBy", "createdBy");

    // Filtering by fromDate
    if (fromDate) {
      query.andWhere("receipt.generatedAt >= :fromDate", { fromDate });
    }

    // Filtering by toDate
    if (toDate) {
      query.andWhere("receipt.generatedAt <= :toDate", { toDate });
    }

    // Filtering by branchId if provided
    if (branchId) {
      query.andWhere(`(order.branch ->> 'id')::text = :branchId`, { branchId });
    }

    // Sorting if provided
    if (sort) {
      query.orderBy("receipt.generatedAt", sort);
    }

    // Pagination
    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      total,
      page,
      limit,
      items: items.map((receipt) => ({
        ...receipt,
        createdBy: receipt.createdBy
          ? {
              id: receipt.createdBy.id,
              username: receipt.createdBy.username,
              email: receipt.createdBy.email,
            }
          : null,
      })),
    };
  }

  async getRefundedReceiptByReservationId(reservationId: string): Promise<ReceiptEntity[]> {
    try {
      // First find the order associated with the reservation
      const order = await this.orderRepository.findOne({
        where: { reservation: { id: reservationId } },
        relations: [
          "reservation",
          "reservation.services",
          "reservation.rootoshes",
        ],
      });

      if (!order) {
        throw new NotFoundException(
          this.i18n.translate("test.RECEIPT.ORDER_NOT_FOUND_FOR_RESERVATION", {
            args: { reservationId },
          })
        );
      }

      // Find all refunded receipts for this order
      const refundedReceipts = await this.receiptRepository.find({
        where: {
          order: { id: order.id },
          isRefunded: true
        },
        relations: [
          "order",
          "order.customer",
          "createdBy"
        ],
        order: {
          generatedAt: 'DESC' // Most recent first
        }
      });

      if (!refundedReceipts || refundedReceipts.length === 0) {
        throw new NotFoundException(
          this.i18n.translate("test.RECEIPT.NO_REFUND_RECEIPTS_FOUND", {
            args: { orderId: order.id },
          })
        );
      }

      return refundedReceipts; // Return the entities directly without transformation

    } catch (error) {
      console.error("Error fetching refunded receipts:", error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        this.i18n.translate("test.RECEIPT.FETCH_FAILED")
      );
    }
  }
  
}
