import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import { InjectRepository } from "@nestjs/typeorm";
import { OrderEntity } from "./entities/order.entity";
import { Repository } from "typeorm";
import { ReservationEntity } from "../reservation/entities/reservation.entity";

import { EmployeeEntity } from "../employee/entities/employee.entity";
import { FindOrdersDto } from "./dto/find.all.orders.dto";
import { OrderStatus } from "./utils/order.status.enum";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { UserEntity } from "../user/entities/user.entity";

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
    private readonly userRepository: Repository<UserEntity>
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
  async createOrder(
    reservationId: string,
    userId: string
  ): Promise<OrderEntity> {
    // Fetch reservation with related services
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
      relations: ["services", "customer"],
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

    const newOrder = this.orderRepository.create({
      customerName: reservation.customer.fullName,
      date: `${reservation.reservationYear}-${reservation.reservationMonth}-${reservation.reservationDay}`,
      service: reservation.services
        .map((service) => service.english_Name)
        .join(", "),
      status: OrderStatus.Completed,
      paymentStatus: "partially paid",
      invoiceNumber: invoiceNumber,
      comments: [],
      reservation: reservation,
      artist: null,
      createdBy, // Set createdBy field with limited user data
    });

    try {
      return await this.orderRepository.save(newOrder);
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to create order",
        error.stack
      );
    }
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async updatePaymentStatus(
    orderId: string,
    newPaymentStatus: "paid" | "partially paid",
    image: Express.Multer.File,
    userId: string // Optional parameter for the user ID
  ): Promise<OrderEntity> {
    // Fetch the order by ID
    let order: OrderEntity;
    try {
      order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      // Check if the order exists
      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // Update the paymentStatus
      order.paymentStatus = newPaymentStatus;

      // Update image URL if provided

      const folderName = "orders-payment-status"; // or any other dynamic name based on context
      const resultimage = await this.CloudinaryService.uploadImage(
        image,
        folderName
      );
      // Update image URL if provided
      if (resultimage) {
        console.log(`Updating image URL for order ID ${orderId}`);
        order.image_order_payment_status_Url = resultimage.url;
      }
      // Fetch the user who is creating the order
      const updatedByobj = await this.userRepository.findOne({
        where: { id: userId },
        select: ["id", "username", "email", "role"], // Select only the required fields
      });
      if (!updatedByobj) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      // Update the updatedBy field if userId is provided
      order.updatedBy = updatedByobj;

      try {
        // Save the updated order
        return await this.orderRepository.save(order);
      } catch (error) {
        console.error("Failed to save updated order:", error);
        throw new InternalServerErrorException(
          "Failed to update payment status",
          error.stack
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Re-throw specific not found exception
      } else {
        throw new InternalServerErrorException(
          "Error fetching the order",
          error.stack
        );
      }
    }
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Method to update the status of an order
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    image: Express.Multer.File,
    userId: string // Optional parameter for the user ID
  ): Promise<OrderEntity | { paymentAmount: number }> {
    let order: OrderEntity;

    // console.log(`Attempting to find order with ID: ${orderId}`);

    try {
      order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ["receipts", "reservation"], // Ensure that the receipts and reservation relations are loaded
      });

      if (!order) {
        // console.log(`Order with ID ${orderId} not found`);
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // console.log(`Order with ID ${orderId} found. Status: ${order.status}, Payment Status: ${order.paymentStatus}`);
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

    // Check if the new status is 'cancel' and handle payment details
    if (newStatus === OrderStatus.Canceled) {
      // console.log(`New status is 'Canceled'. Processing payment details for order ID: ${orderId}`);

      try {
        if (!order.reservation) {
          console.log(`No reservation found for order with ID ${orderId}`);
          throw new NotFoundException(
            `No reservation found for order with ID ${orderId}`
          );
        }

        const deposit = order.reservation.deposit; // Get deposit from the reservation

        let paymentAmount: number;
        if (order.paymentStatus === "paid") {
          // If paymentStatus is 'paid', return totalPayment from the receipt
          if (order.receipts.length === 0) {
            console.log(`No receipt found for order with ID ${orderId}`);
            throw new NotFoundException(
              `No receipt found for order with ID ${orderId}`
            );
          }

          const receipt = order.receipts[0]; // Assuming you need the first receipt
          paymentAmount = receipt.totalPayment;
        } else if (order.paymentStatus === "partially paid") {
          // If paymentStatus is 'partially paid', return deposit from reservation
          paymentAmount = deposit;
        } else {
          throw new InternalServerErrorException(
            `Invalid payment status: ${order.paymentStatus}`
          );
        }

        // console.log(`Payment Amount: ${paymentAmount}`);
        return { paymentAmount };
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

    // Update the status
    order.status = newStatus;
    // Upload image
    const folderName = "orders-status"; // or any other dynamic name based on context
    const resultimage = await this.CloudinaryService.uploadImage(
      image,
      folderName
    );
    // Update image URL if provided
    if (resultimage) {
      console.log(`Updating image URL for order ID ${orderId}`);
      order.image_order_status_Url = resultimage.url;
    }

    // Fetch the user who is creating the order
    const updatedByobj = await this.userRepository.findOne({
      where: { id: userId },
      select: ["id", "username", "email", "role"], // Select only the required fields
    });
    if (!updatedByobj) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    // Update the updatedBy field if userId is provided
    order.updatedBy = updatedByobj;

    try {
      const updatedOrder = await this.orderRepository.save(order);
      console.log(
        `Order status updated successfully. New status: ${updatedOrder.status}`
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
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async assignOrderToArtist(
    orderId: string,
    artistId: string
  ): Promise<OrderEntity> {
    let order: OrderEntity;
    let artist: EmployeeEntity;

    try {
      // Find the order
      order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // Find the artist
      artist = await this.employeeRepository.findOne({
        where: { id: artistId },
        relations: ["employeeType"], // Ensure employeeType is included
      });

      if (!artist) {
        throw new NotFoundException(`Artist with ID ${artistId} not found`);
      }

      // Check if the employee is an artist
      if (artist.employeeType.typeEnglish !== "Artist") {
        throw new NotFoundException(
          `Employee with ID ${artistId} is not an artist`
        );
      }

      // Assign the order to the artist
      order.artist = artist;

      // Save the updated order
      return await this.orderRepository.save(order);
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to assign order to artist",
        error.stack
      );
    }
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async findAllOrders(
    findOrdersDto: FindOrdersDto
  ): Promise<{ items: OrderEntity[]; total: number }> {
    const { page, limit, sort, employeeName } = findOrdersDto;

    try {
      const query = this.orderRepository
        .createQueryBuilder("order")
        .leftJoinAndSelect("order.artist", "artist") // Join artist relation
        .leftJoinAndSelect("order.createdBy", "createdBy") // Join createdBy relation
        .leftJoinAndSelect("order.updatedBy", "updatedBy") // Join updatedBy relation
        .take(limit)
        .skip((page - 1) * limit)
        .orderBy("order.date", sort.toUpperCase() as "ASC" | "DESC");

      if (employeeName) {
        query.andWhere("artist.englishName ILIKE :employeeName", {
          employeeName: `%${employeeName}%`,
        });
      }

      const [items, total] = await query.getManyAndCount();

      return { items, total };
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to get orders",
        error.stack
      );
    }
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Method to get the count of each order status
  async getOrderStatusCount(): Promise<{ items: { [key in OrderStatus]: number } }> {
    const orders = await this.orderRepository
      .createQueryBuilder("order")
      .select("order.status", "status")
      .addSelect("COUNT(order.id)", "count")
      .groupBy("order.status")
      .getRawMany();

    // Initialize the status count object with all possible statuses
    const orderStatusCounts: { [key in OrderStatus]: number } = {
      [OrderStatus.InProgress]: 0,
      [OrderStatus.InQueue]: 0,
      [OrderStatus.Working]: 0,
      [OrderStatus.Done]: 0,
      [OrderStatus.Completed]: 0,
      [OrderStatus.Canceled]: 0,
    };

    // Populate the orderStatusCounts object with the results from the query
    orders.forEach((order) => {
      orderStatusCounts[order.status] = parseInt(order.count, 10);
    });

    return { items: orderStatusCounts };
  }
}
