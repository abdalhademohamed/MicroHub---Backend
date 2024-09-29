import {
  BadRequestException,
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
import { format } from "date-fns/format";

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

    @InjectEntityManager() private readonly entityManager: EntityManager
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
    userId: string,
    paymentId: string
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
        "Visa payment method not found, please add payment method called Visa in English & arabic"
      );
    }

    const invoiceNumber = await this.generateUniqueInvoiceNumber();

    const newOrder = this.orderRepository.create({
      customer: reservation.customer,
      date: `${reservation.reservationYear}-${reservation.reservationMonth}-${reservation.reservationDay}`,
      serviceEnglish: reservation.services
        .map((service) => service.english_Name)
        .join(", "),
      serviceArabic: reservation.services
        .map((service) => service.arabic_Name)
        .join(", "),
      status: OrderStatus.Completed,
      paymentStatus: "partially paid",
      invoiceNumber: invoiceNumber,
      comments: [],
      reservation: reservation,
      branch: {
        id: reservation.branch.id, // Include branch ID
        name: reservation.branch.name, // Include branch name
      }, // Return an object with id and name of the branch
      artist: null,
      createdBy, // Set createdBy field with limited user data
      payment: visaPayment, // Assign the Visa payment method to the order
    });

    try {
      return await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          // Save the new order
          const savedOrder = await transactionalEntityManager.save(
            OrderEntity,
            newOrder
          );

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

          return savedOrder;
        }
      );
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to create order",
        error.stack
      );
    }
  }
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
    order.updatedBy=UpdateBy
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
    order.updatedBy=UpdateBy
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
    newPaymentStatus: "paid" | "partially paid",
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

      // Update the paymentStatus
      order.paymentStatus = newPaymentStatus;

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
  ): Promise<OrderEntity | { paymentAmount: number }> {
    let order: OrderEntity;

    try {
      // Fetch the order by ID
      order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ["receipts", "reservation"], // Ensure that the receipts and reservation relations are loaded
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

    if (newStatus === OrderStatus.Canceled) {
      try {
        if (!order.reservation) {
          throw new NotFoundException(
            `No reservation found for order with ID ${orderId}`
          );
        }

        const deposit = order.reservation.deposit; // Get deposit from the reservation
        let paymentAmount: number;

        if (order.paymentStatus === "paid") {
          if (order.receipts.length === 0) {
            throw new NotFoundException(
              `No receipt found for order with ID ${orderId}`
            );
          }

          const receipt = order.receipts[0]; // Assuming you need the first receipt
          paymentAmount = receipt.totalPayment;
        } else if (order.paymentStatus === "partially paid") {
          paymentAmount = deposit;
        } else {
          throw new InternalServerErrorException(
            `Invalid payment status: ${order.paymentStatus}`
          );
        }

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

      // Assign the DTO to the order
      order.artist = artistDto as any; // Type assertion to bypass TypeScript checks

      // Save the updated order
      const updatedOrder = await this.orderRepository.save(order);

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
    findOrdersDto: FindOrdersDto
  ): Promise<{ items: OrderEntity[]; total: number }> {
    const { page, limit, sort, employeeName, branchId, dayDate } =
      findOrdersDto;

    try {
      // Build the query
      const query = this.orderRepository
        .createQueryBuilder("o")
        .leftJoinAndSelect("o.artist", "a") // Join artist relation with alias "a"
        .leftJoinAndSelect("o.payment", "p") // Join payment relation with alias "p"
        .leftJoinAndSelect("o.customer", "c") // Join customer relation with alias "c"
        .addSelect(["c.id", "c.fullName", "c.phoneNumber"]) // Select specific fields from customer
        .leftJoin("o.createdBy", "cb") // Join createdBy relation with alias "cb"
        .addSelect(["cb.id", "cb.username", "cb.email", "cb.role"]) // Select specific fields from createdBy
        .leftJoin("o.updatedBy", "ub") // Join updatedBy relation with alias "ub"
        .addSelect(["ub.id", "ub.username"]) // Select specific fields from updatedBy
        .take(limit)
        .skip((page - 1) * limit)
        .orderBy(`o.date`, sort.toUpperCase() as "ASC" | "DESC"); // Order by date

      // Filter by employee name if provided
      if (employeeName) {
        query.andWhere("a.englishName ILIKE :employeeName", {
          employeeName: `%${employeeName}%`,
        });
      }

      // Filter by branch ID if provided
      if (branchId) {
        query.andWhere("CAST(o.branch ->> 'id' AS uuid) = :branchId", {
          branchId,
        });
      }

      // Filter by day date if provided
      if (dayDate) {
        const startDate = new Date(dayDate);
        const endDate = new Date(dayDate);
        endDate.setDate(startDate.getDate() + 1); // End of the day

        query.andWhere("o.date >= :startDate AND o.date < :endDate", {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });
      }

      // Log the generated SQL query for debugging
      // console.log(query.getSql());

      // Execute the query and get results
      const [items, total] = await query.getManyAndCount();

      return { items, total };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException({
          message: error.message || "Entity not found",
          category: "EntityNotFound",
        });
      } else if (error instanceof BadRequestException) {
        throw new BadRequestException({
          message: error.message || "Bad request",
          category: "ValidationError",
        });
      } else {
        throw new InternalServerErrorException({
          message: error.message || "Internal server error",
          category: "InternalServerError",
        });
      }
    }
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Method to get the count of each order status
  async getOrderStatusCount(
    branchId: string
  ): Promise<{ items: { [key in OrderStatus]: number } }> {
    const orders = await this.orderRepository
      .createQueryBuilder("order")
      .innerJoin("order.reservation", "reservation")
      .select("order.status", "status")
      .addSelect("COUNT(order.id)", "count")
      .where("reservation.branchId = :branchId", { branchId })
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
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async findOrdersByEmployeeAndDay(
    userId: string,
    findOrdersByDayDto: FindOrdersByDayDto
  ): Promise<{ items: any[]; total: number }> {
    const { page, limit, sort, dayDate } = findOrdersByDayDto;

    try {
      // Fetch the employee by userId, including relations
      const employee = await this.employeeRepository.findOne({
        where: { id: userId },
        relations: [
          "orders",
          "orders.customer", // Ensure 'customer' relation is loaded
          "orders.payment", // Ensure 'payment' relation is loaded
          "orders.artist", // Ensure 'artist' relation is loaded
          "branch", // Ensure 'branch' relation is loaded
        ],
      });

      if (!employee) {
        throw new NotFoundException(`Employee with userId ${userId} not found`);
      }

      // Filter orders by dayDate using range for better accuracy
      const dayStart = new Date(dayDate);
      const dayEnd = new Date(dayDate);
      dayEnd.setDate(dayEnd.getDate() + 1); // Next day

      const filteredOrders = employee.orders.filter((order) => {
        const orderDate = new Date(order.date);
        return orderDate >= dayStart && orderDate < dayEnd;
      });

      // Apply sorting
      const sortedOrders = filteredOrders.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (sort === "ASC") return dateA.getTime() - dateB.getTime();
        if (sort === "DESC") return dateB.getTime() - dateA.getTime();
        return 0; // Default if sort is invalid
      });

      // Paginate the orders
      const paginatedOrders = sortedOrders.slice(
        (page - 1) * limit,
        page * limit
      );

      // Map orders to include artist, payment, customer, and branch details
      const mappedOrders = paginatedOrders.map((order) => ({
        id: order.id,
        date: order.date.toString(), // Ensure correct date format
        serviceEnglish: order.serviceEnglish,
        serviceArabic: order.serviceArabic,
        invoiceNumber: order.invoiceNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        image_order_status_Url: order.image_order_status_Url,
        image_order_payment_status_Url: order.image_order_payment_status_Url,
        artist: order.artist
          ? {
              id: order.artist.id,
              username: order.artist.username,
              email: order.artist.email,
              role: order.artist.role,
              english_Name: order.artist.english_Name,
              arabic_Name: order.artist.arabic_Name,
              workingHours: order.artist.workingHours,
              countryCode: order.artist.countryCode,
              phoneNumber: order.artist.phoneNumber,
              image: order.artist.image,
              available: order.artist.available,
              totalReviews: order.artist.totalReviews,
              status: order.artist.status,
              oldestAvgRating: order.artist.oldestAvgRating,
              newestAvgRating: order.artist.newestAvgRating,
            }
          : null,
        payment: order.payment
          ? {
              id: order.payment.id,
              methodEnglish: order.payment.methodEnglish,
              methodArabic: order.payment.methodArabic,
              image: order.payment.image,
              createdAt: order.payment.createdAt.toISOString(),
            }
          : null,
        customer: order.customer
          ? {
              id: order.customer.id,
              country_Code: order.customer.country_Code,
              phoneNumber: order.customer.phoneNumber,
              fullName: order.customer.fullName,
              dateOfBirth: order.customer.dateOfBirth,
            }
          : null,
        branch: employee.branch
          ? {
              id: employee.branch.id,
              name: employee.branch.name,
              // Add more branch fields as needed
            }
          : null,
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
        relations: ["createdBy", "artist"], // Add relations if needed
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
}
