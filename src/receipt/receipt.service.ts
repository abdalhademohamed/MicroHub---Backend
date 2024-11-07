import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
// import * as PDFDocument from 'pdfkit';
import PDFDocument from "pdfkit"; // Default import
import { Response } from "express";

import { CreateReceiptDto } from "./dto/create.receipt.dto";
import { UpdateReceiptDto } from "./dto/update-receipt.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { ReceiptEntity } from "./entities/receipt.entity";
import { Repository } from "typeorm";
import { OrderEntity } from "../orders/entities/order.entity";
import { UserEntity } from "../user/entities/user.entity";
import { ServiceEntity } from "../service/entities/service.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { OfferEntity } from "../offer/entities/offer.entity";
import { CreateReceiptFromReservationIdDto } from "./dto/create.receipt.from.reservationId.dto";
import { GetReceiptsDto } from "./dto/get-receipts.dto";
import { CustomI18nService } from "../common/custom.18n.service";
import { I18nService } from "nestjs-i18n";
import { SharableOfferEntity } from "src/sharable-offer/entities/sharable-offer.entity";

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

      const services = reservation.services;
      const rootoshes = reservation.rootoshes;
      // if (!services || services.length === 0) {
      //   throw new NotFoundException("No services found for the reservation");
      // }
      // if (services || services.length > 0) {
      //   throw new NotFoundException("No services found for the reservation");
      // }
      // if (rootoshes) {
      //   // Format the services for receipt
      //   const formattedPaymentForRootoshes = rootoshes.map((service) => ({
      //     name: service.english_Name,
      //     duration: service.duration_Mins,
      //     price: 0, // Ensure price is a string
      //   }));
      // }  // Determine the formatted services/rootoshes for the receipt
      let formattedPaymentForServices = [];
      let formattedPaymentForRootoshes = [];
      // Declare the offer variable outside the if block
      if (services && services.length > 0) {
        if (order.sharableOfferId) {
          // Fetch the sharable offer with its services
          const sharableOffer = await this.sharableOfferRepository.findOne({
            where: { id: order.sharableOfferId },
            relations: ["services"],
          });

          if (!sharableOffer) {
            throw new NotFoundException("Sharable offer not found");
          }
          // Map the services from the sharable offer
          formattedPaymentForServices = sharableOffer.services.map(
            (service) => ({
              name: service.english_Name,
              duration: service.duration_Mins,
              price: service.price.toString(), // Ensure price is a string
            })
          );
        }
        else if (order.couponId) {
          formattedPaymentForServices = services.map((services) => ({
            name: services.english_Name,
            duration: services.duration_Mins,
            price: 0, // Assuming the price for services is 0, as per your original logic
          }));
        }else{
          formattedPaymentForServices = services.map((service) => ({
            name: service.english_Name,
            duration: service.duration_Mins,
            price: service.price.toString(), // Ensure price is a string
          }));
        }
       
      } else if (rootoshes && rootoshes.length > 0) {
        formattedPaymentForRootoshes = rootoshes.map((rootosh) => ({
          name: rootosh.english_Name,
          duration: rootosh.duration_Mins,
          price: 0, // Assuming the price for rootoshes is 0, as per your original logic
        }));
      }  else {
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

        // // Apply discount if offer exists
        // const discountPercentage = offer ? offer.discountPercentage : 0; // Set discount to 0 if no offer
        // totalPayment -= totalPayment * (discountPercentage / 100);
        // remaining = totalPayment - reservation.deposit;
        // Calculate total payment
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

    // Save the audit log to the audit log repository
    await this.AuditLogRepository.save(auditLog);
  }

  /* -------------------------------------------------------------------------- */
  /*                      createReceiptFromReserverationId                      */
  /* -------------------------------------------------------------------------- */

  //  async createReceiptFromReservationId(
  //   CreateReceiptFromReservationIdDto: CreateReceiptFromReservationIdDto,
  //   userId: string,
  // ): Promise<ReceiptEntity> {
  //   const { reservationId, message } = CreateReceiptFromReservationIdDto;
  //   try {
  //     // Fetch the user who created the receipt
  //     const createdBy = await this.userRepository.findOne({
  //       where: { id: userId },
  //       select: ["id", "username", "email", "role"], // Select only required fields
  //     });
  //     if (!createdBy) {
  //       throw new NotFoundException(`User with ID ${userId} not found`);
  //     }

  //     // Fetch the order and related reservation and services
  //     const order = await this.orderRepository.findOne({
  //       where: { reservation: { id: reservationId } }, // Assuming reservation has an order reference
  //       relations: ["reservation", "reservation.services","reservation.rootoshes"],
  //     });

  //     if (!order) {
  //       throw new NotFoundException(`Order with ID ${order.id} not found`);
  //     }

  //     const reservation = order.reservation;
  //     if (!reservation) {
  //       throw new NotFoundException(
  //         `Reservation not found for Order ID ${order.id}`,
  //       );
  //     }

  //     const services = reservation.services;
  //     if (!services || services.length === 0) {
  //       throw new NotFoundException("No services found for the reservation");
  //     }
  //     // Declare the offer variable outside the if block
  //     let offer = null;

  //     // Fetch the offer if offerId exists
  //     if (order.offerId) {
  //       offer = await this.OfferRepository.findOne({
  //         where: { id: order.offerId },
  //       });
  //       if (!offer) {
  //         // If the offer is not found, set it to null
  //         offer = null;
  //       }
  //     }

  //     if (order.sharableOfferId) {
  //       offer = await this.OfferRepository.findOne({
  //         where: { id: order.sharableOfferId },
  //       });
  //       if (!offer) {
  //         // If the offer is not found, set it to null
  //         offer = null;
  //       }
  //     }

  //     // Calculate total payment
  //     const totalPayment = reservation.totalPrice;
  //     let discountPayment = totalPayment; // Default to totalPayment

  //     // Apply discount if offer exists
  //     const discountPercentage = offer ? offer.discountPercentage : 0; // Set discount to 0 if no offer
  //     discountPayment -= totalPayment * (discountPercentage / 100);
  //     const remaining = discountPayment - reservation.deposit;

  //     // Format the services for receipt
  //     const formattedPaymentForServices = services.map((service) => ({
  //       name: service.english_Name,
  //       duration: service.duration_Mins,
  //       price: service.price.toString(), // Ensure price is a string
  //     }));

  //     // Format the reservation time slot as "startTime-endTime"
  //     const startTime = new Date(reservation.start_Time).toLocaleTimeString(
  //       "en-GB",
  //       { hour: "2-digit", minute: "2-digit" },
  //     );
  //     const endTime = new Date(reservation.end_Time).toLocaleTimeString(
  //       "en-GB",
  //       { hour: "2-digit", minute: "2-digit" },
  //     );
  //     const reservationTimeSlot = `${startTime}-${endTime}`;

  //     // Create and save the receipt
  //     const receipt = this.receiptRepository.create({
  //       order,
  //       reservationTimeSlot,
  //       message,
  //       totalPayment: discountPayment,
  //       paymentForServices: formattedPaymentForServices,
  //       discount: discountPercentage, // Set discount value
  //       remaining,
  //       createdBy,
  //     });

  //     const savedReceipt = await this.receiptRepository.save(receipt);

  //     // Log the creation action in the audit log
  //     await this.saveAuditLogForCreateReceiptFromReservationId(savedReceipt, userId);

  //     return savedReceipt;
  //   } catch (error) {
  //     console.error("Error creating receipt:", error); // Log the error
  //     throw new InternalServerErrorException(
  //       "Failed to create receipt",
  //       error.stack,
  //     );
  //   }
  // }

  async createReceiptFromReservationId(
    CreateReceiptFromReservationIdDto: CreateReceiptFromReservationIdDto,
    userId: string
  ): Promise<ReceiptEntity> {
    const { reservationId, message } = CreateReceiptFromReservationIdDto;
    try {
      let offer = null;
      let discountPercentage = 0;

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

      const services = reservation.services;
      const rootoshes = reservation.rootoshes;

      let formattedPaymentForServices = [];
      let formattedPaymentForRootoshes = [];

      if (services && services.length > 0) {
        formattedPaymentForServices = services.map((service) => ({
          name: service.english_Name,
          duration: service.duration_Mins,
          price: service.price.toString(),
        }));
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

  // async generatePdfReceipt(receiptId: string, response: Response) {
  //   try {
  //     const receipt = await this.receiptRepository.findOne({
  //       where: { id: receiptId },
  //       relations: ["order", "order.reservation", "services", "createdBy"],
  //     });

  //     if (!receipt) {
  //       throw new NotFoundException("Receipt not found");
  //     }

  //     const doc = new PDFDocument();
  //     response.setHeader("Content-Type", "application/pdf");
  //     response.setHeader(
  //       "Content-Disposition",
  //       `attachment; filename="receipt-${receipt.order.id}-${receiptId}.pdf"`
  //     );

  //     doc.pipe(response);

  //     // Title
  //     doc.fontSize(18).text("Receipt", { align: "center" });
  //     doc.moveDown();

  //     // Order Details
  //     doc.fontSize(12).text(`Order ID: ${receipt.order.id}`);
  //     doc.text(`Customer Name: ${receipt.order.customerName}`);
  //     doc.text(`Date: ${receipt.order.date}`);
  //     doc.text(`Reservation Time Slot: ${receipt.reservationTimeSlot}`);
  //     doc.text(`Message: ${receipt.message}`);
  //     doc.text(`Total Payment: $${receipt.totalPayment.toFixed(2)}`);
  //     doc.text(`Discount: $${receipt.discount.toFixed(2)}`);
  //     doc.text(`Remaining: $${receipt.remaining.toFixed(2)}`);
  //     doc.moveDown();

  //     // Services Details
  //     doc.text("Services:");
  //     receipt.services.forEach((service) => {
  //       doc.text(
  //         `- ${service.english_Name}: ${service.duration_Mins} mins - $${service.price.toFixed(2)}`
  //       );
  //     });
  //     doc.moveDown();

  //     // Created By
  //     if (receipt.createdBy) {
  //       doc.text(`Created By: ${receipt.createdBy.username}`); // Adjust based on your UserEntity properties
  //     }

  //     doc.end();
  //   } catch (error) {
  //     throw new InternalServerErrorException(
  //       "Failed to generate PDF receipt",
  //       error.stack
  //     );
  //   }
  // }

  // async generatefakePdfReceipt(receiptId: string, response: Response) {
  //   try {
  //     // Fake receipt data for testing
  //     const receipt = {
  //       order: {
  //         id: receiptId,
  //         customerName: "John Doe",
  //         date: "2024-09-15",
  //       },
  //       reservationTimeSlot: "10:00 AM - 11:00 AM",
  //       message: "Thank you for your visit!",
  //       totalPayment: 100.0,
  //       discount: 10.0,
  //       remaining: 90.0,
  //       services: [
  //         { english_Name: "Haircut", duration_Mins: 30, price: 50.0 },
  //         { english_Name: "Shampoo", duration_Mins: 15, price: 20.0 },
  //       ],
  //       createdBy: { username: "admin" },
  //     };

  //     if (!receipt) {
  //       throw new NotFoundException("Receipt not found");
  //     }

  //     const doc = new PDFDocument({ margin: 50 });

  //     response.setHeader("Content-Type", "application/pdf");
  //     response.setHeader(
  //       "Content-Disposition",
  //       `attachment; filename="receipt-${receipt.order.id}-${receiptId}.pdf"`
  //     );

  //     doc.pipe(response);

  //     //   // Path to the image file (absolute path)
  //     // const imagePath = "C:\\Users\\mahmo\\Downloads\\Screenshot 2024-09-11 141104.png"; // Windows path

  //     //   // Add Logo
  //     //   doc.image(imagePath, { width: 150 }); // Adjust path and size
  //     doc.moveDown();

  //     // Title
  //     doc.fontSize(24).text("Receipt", { align: "center", underline: true });
  //     doc.moveDown();

  //     // Order Details
  //     doc.fontSize(14).text(`Order ID: ${receipt.order.id}`);
  //     doc.text(`Customer Name: ${receipt.order.customerName}`);
  //     doc.text(`Date: ${receipt.order.date}`);
  //     doc.text(`Reservation Time Slot: ${receipt.reservationTimeSlot}`);
  //     doc.text(`Message: ${receipt.message}`);
  //     doc.text(`Total Payment: $${receipt.totalPayment.toFixed(2)}`);
  //     doc.text(`Discount: $${receipt.discount.toFixed(2)}`);
  //     doc.text(`Remaining: $${receipt.remaining.toFixed(2)}`);
  //     doc.moveDown();

  //     // Add a horizontal line
  //     doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

  //     // Services Details
  //     doc.fontSize(16).text("Services:", { underline: true });
  //     doc.fontSize(12);
  //     receipt.services.forEach((service) => {
  //       doc.text(
  //         `- ${service.english_Name}: ${service.duration_Mins} mins - $${service.price.toFixed(2)}`
  //       );
  //     });
  //     doc.moveDown();

  //     // Created By
  //     if (receipt.createdBy) {
  //       doc.text(`Created By: ${receipt.createdBy.username}`);
  //     }

  //     doc.end();
  //   } catch (error) {
  //     throw new InternalServerErrorException(
  //       "Failed to generate PDF receipt",
  //       error.stack
  //     );
  //   }
  // }

  // async generatePdfReceipt(receiptId: string, response: Response): Promise<void> {
  //   // Fetch the receipt entity based on receiptId
  //   const receipt = await this.receiptRepository.findOne({
  //     where: { id: receiptId },
  //     relations: ['order', 'services'], // Include any related entities you need
  //   });

  //   if (!receipt) {
  //     throw new NotFoundException(`Receipt with ID ${receiptId} not found`);
  //   }

  //   // Create a new PDF document
  //   const doc = await PDFDocument.create();

  //   // Add a page and draw content
  //   const page = doc.addPage();
  //   const { width, height } = page.getSize();
  //   page.drawText(`Receipt ID: ${receipt.id}`, { x: 50, y: height - 100 });
  //   page.drawText(`Order ID: ${receipt.order.id}`, { x: 50, y: height - 130 });
  //   page.drawText(`Total Payment: $${receipt.totalPayment}`, { x: 50, y: height - 160 });
  //   page.drawText(`Reservation Time Slot: ${receipt.reservationTimeSlot}`, { x: 50, y: height - 190 });

  //   // Serialize the document to bytes
  //   const pdfBytes = await doc.save();

  //   // Set response headers
  //   response.setHeader('Content-Type', 'application/pdf');
  //   response.setHeader('Content-Disposition', `attachment; filename="receipt-${receipt.order.id}-${receipt.id}.pdf"`);

  //   // Send the PDF to the client
  //   response.send(pdfBytes);
  // }

  async getReceiptByOrderId(orderId: string): Promise<ReceiptEntity> {
    const receipt = await this.receiptRepository.findOne({
      where: { order: { id: orderId } },
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

  async getReceiptByReservationId(
    reservationId: string
  ): Promise<ReceiptEntity> {
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
      where: { order: { id: order.id } },
    });

    if (!receipt) {
      throw new NotFoundException(
        this.i18n.translate("test.RECEIPT.NOT_FOUND_FOR_ORDER", {
          args: { orderId: order.id },
        })
      );
    }

    return receipt; // paymentForServices will now be correctly returned as an array
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
}
