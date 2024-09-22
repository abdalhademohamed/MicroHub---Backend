import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectEntityManager, InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";
import { ReservationEntity } from "./entities/reservation.entity";
import { BranchEntity } from "../branch/entities/branch.entity";
import { ServiceEntity } from "../service/entities/service.entity";
import { GetReservationsDto } from "./dto/get.reservation.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { CustomerEntity } from "../customer/entities/customer.entity";
import { CreateCustomerDto } from "../customer/dto/create.customer.dto";
import { format } from "date-fns";
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

    @InjectEntityManager() private readonly entityManager: EntityManager,
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

  async calculateTotalDuration(ids: string[]): Promise<{ price: number; duration: number; services: ServiceEntity[] }> {
    const services = await this.ServiceRepository.findByIds(ids);
  
    if (services.length !== ids.length) {
      throw new HttpException("Invalid Service IDs", 400);
    }
  
    // Use array reduction to sum the price and duration
    const { price, duration } = services.reduce(
      (acc, service) => {
        acc.price += Number(service.price);  // Ensure price is a number
        acc.duration += service.duration_Mins;
        return acc;
      },
      { price: 0, duration: 0 } // Initial accumulator
    );
  
    return { price, duration, services };
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

  // Implement the other methods like calculateTotalDuration and getWorkingHoursAtSpecificDate
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
  
      // Validate service IDs
      const serviceIds = body.services;
      if (!serviceIds || serviceIds.length === 0) {
        throw new BadRequestException("No services provided");
      }
  
      // Fetch services based on provided IDs
      const services = await this.ServiceRepository.find({
        where: { id: In(serviceIds) },
      });
      if (services.length !== serviceIds.length) {
        throw new BadRequestException("Some services were not found");
      }
  
      // Calculate total duration and price of services
      const { duration, price } = await this.calculateTotalDuration(serviceIds);
      
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
  
      // Ensure image is provided
      if (!image) {
        throw new BadRequestException("Photo is required");
      }
  
      // Upload image to Cloudinary
      const folderName = "reservation";
      const result = await this.CloudinaryService.uploadImage(image, folderName);
  
      // Validate customer existence
      const customer = await this.CustomerRepository.findOneBy({
        phoneNumber: body.phone_Number,
      });
      if (!customer) {
        throw new NotFoundException("Customer not found");
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
        deposit_Content: result.url,
        services,
      });
  
      await this.ReservationRepository.save(reservation);
  
      // Create an order for the reservation
      await this.OrdersService.createOrder(reservation.id, userId);
  
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
          message: error.stack,
          category: "EntityNotFound", // Custom error category
        });
      } else if (error instanceof BadRequestException) {
        throw new BadRequestException({
          message: error.stack,
          category: "ValidationError", // Custom error category
        });
      
      } else {
        throw new InternalServerErrorException({
          message: error.stack,
          category: "InternalServerError", // Custom error category for unexpected errors
          // details: error.stack, // Additional details for debugging
        });
      }
    }
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

  async updateReservationServices(id: string, body: UpdateReservationDto, userId: string) {
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
  
    const { duration, services, price } = await this.calculateTotalDuration(body.services);
    const startTime = new Date(body.startTime);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    const workingHours = await this.getWorkingHoursAtSpecificDate(reservation.branch.id, startTime);
  
    const index = workingHours.findIndex((w) => w.from <= startTime && w.to >= endTime);
    if (index === -1) {
      throw new BadRequestException("The custom schedule conflicts with an existing reservation.");
    }
  
    const newWorkingHours = this.newAddedWorkingHours({
      fromOriginal: workingHours[index].from,
      toOriginal: workingHours[index].to,
      fromUser: startTime,
      toUser: endTime,
    }, workingHours[index].slot);
  
    await this.cancelReservationAndAddSlot(reservation.start_Time, reservation.end_Time, reservation.branch.id);
    await this.WorkingHourEntity.save(newWorkingHours);
    await this.WorkingHourEntity.delete({ id: workingHours[index].id });
  
    // Log the changes before saving the updated reservation
    const oldReservation = { ...reservation }; // Clone the old reservation for comparison
    reservation.start_Time = startTime;
    reservation.end_Time = endTime;
    reservation.services = services;
    reservation.totalPrice = price;
  
    await this.ReservationRepository.save(reservation);
  
    // Create a new order for the updated reservation
    await this.OrdersService.createOrder(reservation.id, userId);
  
    // Create an audit log entry for the updated reservation
    const changedColumns = ['start_Time', 'end_Time', 'services', 'totalPrice'];
    const changesDetails = {};
  
    changedColumns.forEach(column => {
      changesDetails[column] = {
        oldValue: oldReservation[column],
        newValue: reservation[column],
      };
    });
  
    const log = new AuditLogEntity();
    log.tableName = 'reservation';
    log.action = 'UPDATE';
    log.entityId = reservation.id;
    log.changedColumns = changedColumns;
    log.changesDetails = changesDetails;
    log.performedBy = userId;
  
    const user = await this.UserRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'email', 'role'],
    });
    if (user) {
      log.userDetails = user;
    }
  
    await this.entityManager.save(AuditLogEntity, log);
  
    return { status: 'Reservation updated' };
  }
  
  
  async updateTime(id: string, body: UpdateTimeReservationDto, userId: string) {
    // Fetch the reservation with necessary relations
    const reservation = await this.ReservationRepository.findOne({
      where: { id },
      relations: {
        branch: true,
        services: true,
      },
    });
  
    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }
  
    // Calculate total price and duration of services
    const acc = { price: 0, duration: 0 };
    for (const service of reservation.services) {
      acc.price += service.price;
      acc.duration += service.duration_Mins;
    }
  
    // Determine new start and end times
    const startTime = new Date(body.startTime);
    const endTime = new Date(startTime.getTime() + 1000 * 60 * acc.duration);
  
    // Check if the new times fit within working hours
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
  
    // Prepare new working hours and update
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
  
    // Log the changes before updating the reservation
    const oldReservation = { ...reservation }; // Clone the old reservation for comparison
  
    // Update the reservation with new times
    reservation.start_Time = startTime;
    reservation.end_Time = endTime;
  
    await this.ReservationRepository.save(reservation);
  
    // Create an audit log entry
    const changedColumns = ['start_Time', 'end_Time'];
    const changesDetails = {};
  
    changedColumns.forEach(column => {
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
      select: ['id', 'username', 'email', 'role'],
    });
    if (user) {
      log.userDetails = user;
    }
  
    await this.entityManager.save(AuditLogEntity, log);
  
    return { status: 'Time updated' };
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
      where: { to: start },
    });
    const endWorkingHour = await this.WorkingHourEntity.findOne({
      where: { from: end },
    });
    if (startWorkingHour) {
      start = startWorkingHour.from;
      await this.WorkingHourEntity.delete(startWorkingHour);
    }
    if (endWorkingHour) {
      end = endWorkingHour.to;
      await this.WorkingHourEntity.remove(endWorkingHour);
    }
    const workingSlot = this.WorkingHourEntity.create({
      from: start,
      to: end,
      slot,
      duration: Math.ceil((start.getTime() - end.getTime()) / (1000 * 60)),
    });
    await this.WorkingHourEntity.save(workingSlot);
  }
}
