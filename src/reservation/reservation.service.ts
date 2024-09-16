import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
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
    userId:string
  ) {
    const branch = await this.BranchRepository.findOne({
      where: { id: body.branch },
    });
    if (!branch) {
      throw new NotFoundException("Branch not found");
    }
    const serviceIds = body.services;
    if (!serviceIds || serviceIds.length === 0) {
      throw new BadRequestException("No services provided");
    }

    // Fetch services based on provided IDs
    const services = await this.ServiceRepository.find({
      where: {
        id: In(serviceIds),
      },
    });

    // Ensure all requested services were found
    if (services.length !== serviceIds.length) {
      throw new BadRequestException("Some services were not found");
    }
    const { duration, price } = await this.calculateTotalDuration(serviceIds);
    const startTime = new Date(body.customStartTime);
    const endTime = new Date(startTime.getTime() + duration * 1000 * 60);
    const workingHours = await this.getWorkingHoursAtSpecificDate(
      body.branch,
      startTime
    );
    const index = workingHours.findIndex(
      (w) => w.from <= startTime && w.to >= endTime
    );
    if (index == -1) {
      throw new BadRequestException(
        "The custom schedule conflicts with an existing reservation."
      );
    }
    // Ensure image is provided
    if (!image) {
      throw new BadRequestException("Photo is required");
    }

    // Upload image
    const folderName = "reservation"; // or any other dynamic name based on context
    const result = await this.CloudinaryService.uploadImage(image, folderName);
    const customer = await this.CustomerRepository.findOneBy({
      phoneNumber: body.phone_Number,
    });
    if (!customer) {
      throw new BadRequestException("Customer not found");
    }
    // Create and save reservation
    const reservation = this.ReservationRepository.create({
      customer, // Unified date field
      totalPrice: Math.ceil(price),
      deposit: body.deposit,
      start_Time: startTime,
      end_Time: endTime,
      reservationDay: startTime.getDate(),
      reservationMonth: startTime.getMonth() + 1, // Months are 0-indexed
      reservationYear: startTime.getFullYear(),
      branch,
      deposit_Content: result.url,
      services,
    });
    // reservation.services = services;
    await this.ReservationRepository.save(reservation);
    await this.OrdersService.createOrder(reservation.id,userId)

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
  

// Create a receipt
// const createReceiptDto = {
//   orderId: reservation.id, // Assuming reservation ID is used as the order ID
//   message: "Thank you for your reservation!",
//   discount: 0, // Set discount if applicable
//   remaining: Math.ceil(price) - body.deposit,
//   serviceIds: body.services, // Assuming you want to use service IDs from the reservation
// };
// const receipt = await this.createReceipt(createReceiptDto, userId);
// Create order after the reservation
    // await this.OrdersService.createOrder(reservation.id);
    // const receipt = `Receipt:\nCustomer: ${customer.fullName}\nDate: ${startTime.toDateString()}\nStart Time: ${format(startTime, 'HH:mm')}\nEnd Time: ${format(endTime, 'HH:mm')}\nTotal Duration: ${duration} minutes\n`;

    return { reservation };
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
      .leftJoinAndSelect("reservation.services", "services");
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

  async updateReservationServices(id: string, body: UpdateReservationDto) {
    const reservation = await this.ReservationRepository.findOne({
      where: { id },
      relations: {
        branch: true,
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
    if (index == -1) {
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
    reservation.start_Time = startTime;
    reservation.end_Time = endTime;
    reservation.services = services;
    reservation.totalPrice = price;
    await this.ReservationRepository.save(reservation);
    return { status: "reservations updated" };
  }
  async updateTime(id: string, body: UpdateTimeReservationDto) {
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
    const acc = { price: 0, duration: 0 };
    for (const service of reservation.services) {
      acc.price += service.price;
      acc.duration += service.duration_Mins;
    }
    const startTime = new Date(body.startTime);
    const endTime = new Date(startTime.getTime() + 1000 * 60 * acc.duration);
    const workingHours = await this.getWorkingHoursAtSpecificDate(
      reservation.branch.id,
      startTime
    );
    const index = workingHours.findIndex(
      (w) => w.from <= startTime && w.to >= endTime
    );
    if (index == -1) {
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
    await this.ReservationRepository.update(
      { id: reservation.id },
      { start_Time: startTime, end_Time: endTime }
    );
    return { status: "time updated" };
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
