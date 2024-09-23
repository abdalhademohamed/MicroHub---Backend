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

@Injectable()
export class ReceiptService {
  constructor(
    @InjectRepository(ReceiptEntity)
    private readonly receiptRepository: Repository<ReceiptEntity>,

    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async createReceipt(
    createReceiptDto: CreateReceiptDto,
    userId: string,
  ): Promise<ReceiptEntity> {
    const { orderId, message, discount } = createReceiptDto;

    try {
      const createdBy = await this.userRepository.findOne({
        where: { id: userId },
        select: ["id", "username", "email", "role"], // Select only the required fields
      });
      if (!createdBy) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ["reservation", "reservation.services"],
      });
      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      const reservation = order.reservation;
      if (!reservation) {
        throw new NotFoundException(
          `Reservation not found for Order ID ${orderId}`,
        );
      }
      // console.log('Fetched reservation:', reservation);

      const services = reservation.services;
      if (!services || services.length === 0) {
        throw new NotFoundException("No services found for the reservation");
      }
      // console.log(services)
      const totalPayment = reservation.totalPrice;
      const discountPayment = totalPayment - totalPayment * (discount / 100); // Apply discount
      const remaining = discountPayment - reservation.deposit;

      // Format the services data
      // Format the services data as an array of objects
      // Directly format paymentForServices within the method
      const formattedPaymentForServices = reservation.services.map(
        (service) => ({
          name: service.english_Name,
          duration: service.duration_Mins,
          price: service.price.toString(), // Ensure price is a string
        }),
      );

      // Format the reservationTimeSlot to "startTime-endTime"
      const startTime = new Date(reservation.start_Time).toLocaleTimeString(
        "en-GB",
        { hour: "2-digit", minute: "2-digit" },
      );
      const endTime = new Date(reservation.end_Time).toLocaleTimeString(
        "en-GB",
        { hour: "2-digit", minute: "2-digit" },
      );
      const reservationTimeSlot = `${startTime}-${endTime}`;

      const receipt = this.receiptRepository.create({
        order,
        reservationTimeSlot: reservationTimeSlot,
        message,
        totalPayment: discountPayment,
        paymentForServices: formattedPaymentForServices,
        discount,
        remaining,
        createdBy,
        // services,
      });

      return await this.receiptRepository.save(receipt);
    } catch (error) {
      console.error("Error creating receipt:", error); // Log the error
      throw new InternalServerErrorException(
        "Failed to create receipt",
        error.stack,
      );
    }
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
}
