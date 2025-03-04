import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CreateWorkingBranchDto } from "./dto/create.working.branch.dto";
import { UpdateWorkingBranchDto } from "./dto/update.working.branch.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { BranchEntity } from "../branch/entities/branch.entity";
import { FindOptionsWhere, QueryFailedError, Repository } from "typeorm";
import { WorkingBranchEntity } from "./entities/working.branch.entity";
import { WeekDays } from "../branch/utils/days.enum";
import { SlotService } from "../slots/slots.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Postion } from "../postion/utils/postion.enum";
import { ReservationEntity } from "src/reservation/entities/reservation.entity";

@Injectable()
export class WorkingBranchService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,

    @InjectRepository(WorkingBranchEntity)
    private readonly WorkingBranchsRepository: Repository<WorkingBranchEntity>,

    private slotService: SlotService,
    // private eventEmitter: EventEmitter2,
    @InjectRepository(ReservationEntity)
    private readonly ReservationRepository: Repository<ReservationEntity>,
  ) {}

  async getNextFourWeeksDatesForDay(
    weekday: WeekDays,
    branch: string,
  ) {
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    const daysOfWeek = [
      WeekDays.Sunday,
      WeekDays.Monday,
      WeekDays.Tuesday,
      WeekDays.Wednesday,
      WeekDays.Thursday,
      WeekDays.Friday,
      WeekDays.Saturday,
    ];
    const targetDayOfWeek = daysOfWeek.indexOf(weekday);
    let daysToAdd = targetDayOfWeek - todayDayOfWeek;
    if (daysToAdd < 0) {
      daysToAdd += 7;
    }
    const resultDates: { day: number; month: number; year: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const nextDate = new Date();
      nextDate.setDate(today.getDate() + daysToAdd + i * 7);
      resultDates.push({
        day: nextDate.getDate(),
        year: nextDate.getFullYear(),
        month: nextDate.getMonth() + 1,
      });
    }
    for (const { day, year, month } of resultDates) {
      console.log(day, year, month);
      const reservation = await this.ReservationRepository.findOne({
        where: {
          reservationDay: day,
          reservationMonth: month,
          reservationYear: year,
          branch: { id: branch },
        },
        relations: {
          branch: true,
        },
      });
      if (reservation) {
        throw new NotFoundException(`Reservation ${day}-${month}-${year} on ${weekday} already exists with id ${reservation.id}`);
      }
    }
  }

  async createWorkingBranch(
    branchId: string,
    createWorkingBranchDto: CreateWorkingBranchDto,
  ) {
    const { dayOfWeek, workingHours } = createWorkingBranchDto;

    await this.getNextFourWeeksDatesForDay(createWorkingBranchDto.dayOfWeek, branchId);

    // Convert dayOfWeek from string to WeekDays enum
    const weekDayEnum = WeekDays[dayOfWeek as keyof typeof WeekDays];
    if (!weekDayEnum) {
      throw new BadRequestException({
        error: "InvalidDayOfWeek",
        message: `Invalid dayOfWeek: ${dayOfWeek}`,
      });
    }

    // Fetch the branch with the related working branches and employees
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
      relations: ["workingbranch", "employees", "employees.position"],
    });

    if (!branch) {
      throw new NotFoundException({
        error: "BranchNotFound",
        message: `Branch with ID ${branchId} not found`,
      });
    }

    // Check if there is at least one employee with the position of "Artist"
    const artistEmployees = branch.employees.filter(
      (employee) => employee.position?.postion === Postion.ARTIST,
    );

    if (artistEmployees.length === 0) {
      throw new BadRequestException({
        error: "ArtistNotFound",
        message:
          "At least one employee with the position of Artist is required to create working hours.",
      });
    }

    const totalWorkingHours = this.calculateTotalWorkingHours(workingHours);

    const hasSufficientHours = artistEmployees.some((employee) => {
      return employee.workingHours >= totalWorkingHours;
    });

    if (!hasSufficientHours) {
      throw new BadRequestException({
        error: "InsufficientArtistHours",
        message: `At least one artist employee must have working hours matching or exceeding the required total of ${totalWorkingHours}.`,
      });
    }

    let workingBranchEntity = branch.workingbranch.find(
      (wb) => wb.dayOfWeek === weekDayEnum,
    );

    if (workingBranchEntity) {
      // Update existing WorkingBranchEntity
      workingBranchEntity.workingHours = workingHours;
    } else {
      // Create new WorkingBranchEntity
      workingBranchEntity = this.WorkingBranchsRepository.create({
        dayOfWeek: weekDayEnum,
        workingHours,
        branch,
      });
      branch.workingbranch.push(workingBranchEntity);
    }

    // Save the WorkingBranchEntity (either updated or newly created)
    const savedWorkingBranch =
      await this.WorkingBranchsRepository.save(workingBranchEntity);
    // Call the slot service to manage time slots for the branch
    await this.slotService.getNextFourWeeksDatesForDay(
      createWorkingBranchDto.dayOfWeek,
      branchId,
      workingHours,
    );

    // Return only the required fields (id, dayOfWeek, and workingHours)
    return {
      id: savedWorkingBranch.id,
      dayOfWeek: savedWorkingBranch.dayOfWeek,
      workingHours: savedWorkingBranch.workingHours,
    };
  }

  // Method to calculate total working hours based on ranges
  private calculateTotalWorkingHours(workingHours: string[]): number {
    // Initialize total hours
    let totalHours = 0;

    // Check for special case of 24-hour operation
    if (
      workingHours.length === 2 &&
      workingHours[0] === "00:00" &&
      workingHours[1] === "00:00"
    ) {
      return 24; // 24 hours operation
    }

    // Convert workingHours into hour ranges
    for (let i = 0; i < workingHours.length; i += 2) {
      const start = workingHours[i];
      const end = workingHours[i + 1] || start; // Use start if no end is provided
      const startDate = this.convertToDate(start);
      const endDate = this.convertToDate(end);
      totalHours +=
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    }

    return totalHours;
  }

  // Helper method to convert time string to Date
  private convertToDate(time: string): Date {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  // Method to validate working hours
  // private validateWorkingHours(workingHours: string[]): boolean {
  //   // Check for valid time format and duplicates
  //   const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM format
  //   const seenHours = new Set<string>();

  //   for (const hour of workingHours) {
  //     if (!timePattern.test(hour)) {
  //       return false; // Invalid time format
  //     }
  //     if (seenHours.has(hour)) {
  //       return false; // Duplicate time
  //     }
  //     seenHours.add(hour);
  //   }

  //   return true; // All checks passed
  // }

  async findAll(
    branchId?: string,
  ): Promise<Omit<WorkingBranchEntity, "branch">[]> {
    // Validate branchId format if necessary
    if (branchId && typeof branchId !== "string") {
      throw new BadRequestException("Invalid branch ID format");
    }

    // Define the base query options
    const queryOptions: FindOptionsWhere<WorkingBranchEntity> = {};

    // Apply branchId filter if provided
    if (branchId) {
      queryOptions.branch = { id: branchId };
    }

    try {
      // Retrieve working branches with optional filtering and select only necessary fields
      const workingBranches = await this.WorkingBranchsRepository.find({
        where: queryOptions,
        relations: [], // Do not include related branch data
        select: {
          id: true,
          dayOfWeek: true,
          workingHours: true,
        },
      });

      // Optionally handle case where no results are found
      if (workingBranches.length === 0) {
        throw new NotFoundException("No working branches found");
      }

      return workingBranches; // Return the modified result without the branch object
    } catch (error) {
      // Log detailed error information for internal tracking
      // console.error('Error retrieving working branches:', error);

      // Provide more detailed and specific error responses
      if (error instanceof NotFoundException) {
        throw error; // Re-throw known exceptions to preserve specific messages and status codes
      } else if (error instanceof QueryFailedError) {
        // Handle database-specific errors
        throw new BadRequestException(
          "Database query failed. Please check your request and try again.",
        );
      } else {
        // Handle other unexpected errors
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error:
              "An unexpected error occurred while retrieving working branches. Please try again later.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  // Get a specific working branch by ID
  async findOne(id: string): Promise<WorkingBranchEntity> {
    const workingBranch = await this.WorkingBranchsRepository.findOne({
      where: { id },
      relations: ["branch"],
    });
    if (!workingBranch) {
      throw new NotFoundException(`Working branch with ID ${id} not found`);
    }
    return workingBranch;
  }

  // Update a working branch by ID
  async updateWorkingBranches(
    branchId: string,
    updateWorkingBranchesDto: UpdateWorkingBranchDto[],
  ): Promise<BranchEntity> {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
      relations: ["workingbranch"],
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    // Remove existing working branches
    await this.WorkingBranchsRepository.remove(branch.workingbranch);

    // Process each working branch update
    const updatedWorkingBranches = updateWorkingBranchesDto.map((dto) => {
      const newWorkingBranch = this.WorkingBranchsRepository.create({
        ...dto,
        branch: branch,
      });
      return newWorkingBranch;
    });

    // Save new working branches
    branch.workingbranch = await this.WorkingBranchsRepository.save(
      updatedWorkingBranches,
    );

    // Save the branch with updated working branches
    return this.branchRepository.save(branch);
  }
}
