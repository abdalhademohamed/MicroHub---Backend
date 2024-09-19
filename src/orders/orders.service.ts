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
    userId: string
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

    const invoiceNumber = await this.generateUniqueInvoiceNumber();

    const newOrder = this.orderRepository.create({
      customerName: reservation.customer.fullName,
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
      branchName: reservation.branch.name, // Save branch name from reservation
      artist: null,
      createdBy, // Set createdBy field with limited user data
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

      // Fetch the artist
      artist = await this.employeeRepository.findOne({
        where: { id: artistId },
        relations: ["employeeType", "orders"], // Ensure employeeType and orders are included
      });

      if (!artist) {
        throw new NotFoundException(`Artist with ID ${artistId} not found`);
      }

      // Verify if the employee is an artist
      if (artist.employeeType.typeEnglish !== "Artist") {
        throw new NotFoundException(
          `Employee with ID ${artistId} is not an artist`
        );
      }

      // Assign the order to the artist
      order.artist = artist;
      artist.orders.push(order);
      // Save the updated artist with their assigned orders
      await this.employeeRepository.save(artist);
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
            log.userDetails = user; // Include user details in the log
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

  // Method to get the count of each order status
  async getOrderStatusCount(): Promise<{
    items: { [key in OrderStatus]: number };
  }> {
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

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async findOrdersByEmployeeAndDay(
    userId: string,
    findOrdersByDayDto: FindOrdersByDayDto
  ): Promise<{ items: OrderEntity[]; total: number }> {
    const { page, limit, sort, dayDate } = findOrdersByDayDto;
  
    try {
      // Fetch the employee by userId
      const employee = await this.employeeRepository.findOne({
        where: { id: userId },
        relations: ['orders'], // Ensure that the 'orders' relation is loaded
      });
  
      if (!employee) {
        throw new NotFoundException(`Employee with userId ${userId} not found`);
      }
  
      // Filter the orders by dayDate (assuming order.date is a date field)
      const filteredOrders = employee.orders.filter(order =>
        order.date.toString().startsWith(dayDate)
      );
  
      // Apply sorting
      const sortedOrders = filteredOrders.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sort === 'ASC' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      });
  
      // Paginate the orders
      const paginatedOrders = sortedOrders.slice((page - 1) * limit, page * limit);
  
      // Return paginated result
      return { items: paginatedOrders, total: filteredOrders.length };
    } catch (error) {
      console.error('Failed to retrieve orders for employee:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve orders for employee',
        error.stack,
      );
    }
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


  async findOrderById(orderId: string): Promise<OrderEntity | null> {
    try {
      return await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['createdBy', 'artist'], // Add relations if needed
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve the order', error.stack);
    }
  }
}
