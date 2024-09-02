import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ReservationEntity } from "./entities/reservation.entity";
import { BranchEntity } from "../branch/entities/branch.entity";
import { ServiceEntity } from "../service/entities/service.entity";
import { CreateReservationDto } from "./dto/create.reservation.dto";
import { GetReservationsDto } from "./dto/get.reservation.dto";
import { UpdateReservationDto } from "./dto/update.reservation.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { CustomerEntity } from "../customer/entities/customer.entity";
import { CreateCustomerDto } from "../customer/dto/create.customer.dto";
import { format } from "date-fns";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { PositionEntity } from "../postion/entities/postion.entity";
import { create } from "domain";

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

    @InjectRepository(EmployeeEntity)
    private readonly EmployeeRepository: Repository<EmployeeEntity>,
    @InjectRepository(PositionEntity)
    private readonly PositionRepository: Repository<PositionEntity>
  ) {}

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
    const { country_Code, phoneNumber, fullName, dateOfBirth } = createCustomerDto;

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

  private calculateTotalDuration(services: ServiceEntity[]): number {
    return services.reduce(
      (total, service) => total + service.duration_Mins,
      0
    );
  }

  private findAvailableSlot(
    reservations: ReservationEntity[],
    totalDuration: number
  ): { startTime: Date; endTime: Date } | null {
    reservations.sort(
      (a, b) => a.start_Time.getTime() - b.start_Time.getTime()
    );

    let lastEndTime = new Date(); // Starting point for finding gaps

    for (const reservation of reservations) {
      const startTime = reservation.start_Time;
      const endTime = reservation.end_Time;

      const gapDuration =
        (startTime.getTime() - lastEndTime.getTime()) / (1000 * 60);

      if (gapDuration >= totalDuration) {
        return {
          startTime: lastEndTime,
          endTime: new Date(lastEndTime.getTime() + totalDuration * 60 * 1000),
        };
      }

      lastEndTime = endTime;
    }

    return {
      startTime: lastEndTime,
      endTime: new Date(lastEndTime.getTime() + totalDuration * 60 * 1000),
    };
  }

  async createReservation(
    branchId: string,
    createCustomerDto: CreateCustomerDto,
    serviceIds: string[],
    image: Express.Multer.File
  ): Promise<any> {
    const branch = await this.BranchRepository.findOne({
      where: { id: branchId },
      relations: ["reservations", "employees", "employees.position"],
    });

    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    const services = await this.ServiceRepository.findByIds(serviceIds);
    const totalDuration = this.calculateTotalDuration(services);

    const availableSlot = this.findAvailableSlot(
      branch.reservations,
      totalDuration
    );

    if (!availableSlot) {
      throw new BadRequestException("No available slots");
    }
    let startTime: Date;
    let endTime: Date;
    // Check for custom start and end times
    if (createCustomerDto.customStartTime && createCustomerDto.customEndTime) {
      startTime = new Date(createCustomerDto.customStartTime);
      endTime = new Date(createCustomerDto.customEndTime);

      // Validate that the custom times are not conflicting with existing reservations
      const conflictingReservation = branch.reservations.find(
        (reservation) =>
          (startTime >= reservation.start_Time &&
            startTime < reservation.end_Time) ||
          (endTime > reservation.start_Time && endTime <= reservation.end_Time)
      );

      if (conflictingReservation) {
        throw new BadRequestException(
          "The custom schedule conflicts with an existing reservation."
        );
      }
    } else {
      // Find the first available slot if no custom times are provided
      const availableSlot = this.findAvailableSlot(
        branch.reservations,
        totalDuration
      );

      if (!availableSlot) {
        throw new BadRequestException("No available slots");
      }

      startTime = availableSlot.startTime;
      endTime = availableSlot.endTime;
    }
    const reservationDay = startTime.getDate();
    const reservationMonth = startTime.getMonth() + 1; // Months are 0-indexed
    const reservationYear = startTime.getFullYear();

    // Format start time
    // Assign the image URL to the DTO
    const formattedStartTime = format(startTime, "yyyy-MM-dd HH:mm");
    const formattedEndTime = format(endTime, "yyyy-MM-dd HH:mm");

    // const formattedStartTime = format(
    //   new Date(availableSlot.startTime),
    //   "yyyy-MM-dd HH:mm"
    // );
    // const formattedEndTime = format(
    //   new Date(availableSlot.endTime),
    //   "yyyy-MM-dd HH:mm"
    // );
    // Create the reservation with the suggested timing
    if (!image) {
      throw new BadRequestException("Photo is required");
    }
    const folderName = "reservation"; // or any other dynamic name based on context
    const result = await this.CloudinaryService.uploadImage(image, folderName);

    const reservation = this.ReservationRepository.create({
      country_Code: createCustomerDto.country_Code,
      phone_Number: createCustomerDto.phoneNumber,
      client_FullName: createCustomerDto.fullName,
      // day: createCustomerDto.day,
      // month: createCustomerDto.month,
      // year: createCustomerDto.year,
      dateOfBirth: createCustomerDto.dateOfBirth, // Unified date field

      start_Time: formattedStartTime,
      end_Time: formattedEndTime,
      reservationDay,
      reservationMonth,
      reservationYear,
      branch,
      services,
      deposit_Content: result.url,
    });

    // const reservation = new ReservationEntity();
    // reservation.start_Time = availableSlot.startTime;
    // reservation.end_Time = availableSlot.endTime;
    // reservation.branch = branch;
    await this.ReservationRepository.save(reservation);

    const receipt = `Receipt:\nCustomer: ${createCustomerDto.fullName}\nDate: ${availableSlot.startTime.toDateString()}\nStart Time: ${availableSlot.startTime.toTimeString().slice(0, 5)}\nEnd Time: ${availableSlot.endTime.toTimeString().slice(0, 5)}\nTotal Duration: ${totalDuration} minutes\n`;

    return { reservation, receipt };
  }

  async getAllReservations(getReservationsDto: GetReservationsDto): Promise<{
    data: ReservationEntity[];
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

    // Apply pagination
    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async updateReservation(
    id: string,
    updateReservationDto: UpdateReservationDto
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
    } catch (error) {
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
