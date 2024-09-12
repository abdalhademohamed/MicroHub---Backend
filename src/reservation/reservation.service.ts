import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ReservationEntity } from "./entities/reservation.entity";
import { BranchEntity } from "../branch/entities/branch.entity";
import { ServiceEntity } from "../service/entities/service.entity";
import { GetReservationsDto } from "./dto/get.reservation.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { CustomerEntity } from "../customer/entities/customer.entity";
import { CreateCustomerDto } from "../customer/dto/create.customer.dto";
import { format } from "date-fns";
import { CreateReservationDto } from "./dto/create.reservation.dto";
import { WorkingEntity } from "../slots/entities/working.entity";

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
  ) {}
  splitIntervals(
    fromOriginal: Date,
    toOriginal: Date,
    fromUser: Date,
    toUser: Date,
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
    createCustomerDto: CreateCustomerDto,
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

  async calculateTotalDuration(ids: string[]) {
    const services = await this.ServiceRepository.findByIds(ids);
    const acc = { price: 0, duration: 0, services };
    for (const service of services) {
      acc.price += service.price;
      acc.duration += service.duration_Mins;
    }
    return acc;
  }

  async createReservation(
    body: CreateReservationDto,
    image: Express.Multer.File,
  ) {
    const branch = await this.BranchRepository.findOne({
      where: { id: body.branch },
      relations: ["reservations", "employees", "employees.position"],
    });
    if (!branch) {
      throw new NotFoundException("Branch not found");
    }
    const { duration, price, services } =await this.calculateTotalDuration(body.services);
    const startTime = new Date(body.customStartTime);
    const endTime = new Date(body.customEndTime);
    console.log(startTime, endTime);
    const workingHours = await this.WorkingHourEntity.find({
      where: {
        slot: {
          branch: {
            id: body.branch,
          },
        },
      },
      relations: {
        slot: true,
      },
    });
    const index = workingHours.findIndex( (w) => w.from <= startTime && w.to >= endTime );
    if (index == -1) {
      throw new BadRequestException(
        "The custom schedule conflicts with an existing reservation.",
      );
    }
    const Intervals = this.splitIntervals(
      workingHours[index].from,
      workingHours[index].to,
      new Date(body.customStartTime),
      new Date(body.customEndTime),
    );
    const formattedStartTime = format(startTime, "yyyy-MM-dd HH:mm");
    const formattedEndTime = format(endTime, "yyyy-MM-dd HH:mm");

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
      totalPrice: price,
      deposit: body.deposit,
      start_Time: formattedStartTime,
      end_Time: formattedEndTime,
      reservationDay: startTime.getDate(),
      reservationMonth: startTime.getMonth() + 1, // Months are 0-indexed
      reservationYear: startTime.getFullYear(),
      branch,
      services,
      deposit_Content: result.url,
    });

    await this.ReservationRepository.save(reservation);
    console.log(Intervals)
    const newWorkingHours = [];
    for (const { from, to } of Intervals) {
      const duration = Math.floor((to - from) / ( 1000 * 60 ) );
      const new_working = this.WorkingHourEntity.create({
        from,
        to,
        slot: workingHours[index].slot,
        duration,
      });
      newWorkingHours.push(new_working);
    }
    await this.WorkingHourEntity.save(newWorkingHours);
    await this.WorkingHourEntity.delete({ id: workingHours[index].id });
    // Generate receipt
    const receipt = `Receipt:\nCustomer: ${customer.fullName}\nDate: ${startTime.toDateString()}\nStart Time: ${format(startTime, "HH:mm")}\nEnd Time: ${format(endTime, "HH:mm")}\nTotal Duration: ${duration} minutes\n`;

    return { reservation, receipt };
  }

  async getAllReservations(
    getReservationsDto: GetReservationsDto,
    branchId?: string,
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
      query.andWhere("reservation.day = :day", { day });
    }
    if (month) {
      query.andWhere("reservation.month = :month", { month });
    }
    if (year) {
      query.andWhere("reservation.year = :year", { year });
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

  async updateReservation(
    id: string,
    updateReservationDto: any,
  ): Promise<ReservationEntity> {
    const reservation = await this.ReservationRepository.findOne({
      where: { id },
      relations: ["branch", "services"],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    try {
      // Update the reservation details
      this.ReservationRepository.merge(reservation, updateReservationDto);
      return await this.ReservationRepository.save(reservation);
    } catch (e) {
      throw new InternalServerErrorException("Failed to update reservation");
    }
  }

  async deleteReservation(id: string): Promise<void> {
    const reservation = await this.ReservationRepository.findOne({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    // Delete the reservation
    await this.ReservationRepository.remove(reservation);
  }
}
