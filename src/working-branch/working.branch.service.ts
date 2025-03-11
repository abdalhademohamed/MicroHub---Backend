import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateWorkingBranchDto } from "./dto/create.working.branch.dto";
import { UpdateWorkingBranchDto } from "./dto/update.working.branch.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { BranchEntity } from "../branch/entities/branch.entity";
import { Between, FindOptionsWhere, In, QueryFailedError, Repository } from "typeorm";
import { WorkingBranchEntity } from "./entities/working.branch.entity";
import { WeekDays } from "../branch/utils/days.enum";
import { SlotService } from "../slots/slots.service";
import { Postion } from "../postion/utils/postion.enum";
import { ReservationEntity } from "src/reservation/entities/reservation.entity";
import { DateTime } from "luxon";
import { OrderStatus } from "../orders/utils/order.status.enum";
import { CustomI18nService } from "../common/custom.18n.service";

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

    private i18n: CustomI18nService,
  ) {}

  getLocalTime(day: number, month: number, year: number, timezone: string) {
    // Create the date in the specified timezone
    const startOfDayLocal = DateTime.fromObject(
        { year, month, day, hour: 0, minute: 0, second: 0 },
        { zone: timezone }
    );

    const endOfDayLocal = startOfDayLocal.set({ hour: 23, minute: 59, second: 59 });

    // Convert to UTC in ISO format (best for databases)
    const startOfDayUTC = startOfDayLocal.toUTC().toISO(); // "2025-03-06T00:00:00.000Z"
    const endOfDayUTC = endOfDayLocal.toUTC().toISO(); // "2025-03-06T23:59:59.999Z"

    console.log(startOfDayUTC, endOfDayUTC);
    return { startOfDayUTC, endOfDayUTC };
  }

  getUtcTime(localTime: string, timeZone: string): string {
    // Convert local time to UTC
    const utcTime = DateTime.fromFormat(localTime, "HH:mm", {
      zone: timeZone,
    }).toUTC();

    // Return UTC time in ISO format and hour
    return utcTime.toFormat("HH:mm");
  }

  async getNextFourWeeksDatesForDay(weekday: WeekDays, branch: string, timezone: string) {
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
      nextDate.setUTCHours(0,0,0,0);
      nextDate.setDate(today.getDate() + daysToAdd + i * 7);

      resultDates.push({
        day: nextDate.getUTCDate(),
        year: nextDate.getUTCFullYear(),
        month: nextDate.getUTCMonth() + 1,
      });
    }
    for (const { day, year, month } of resultDates) {
      console.log(day, year, month);
      const {startOfDayUTC, endOfDayUTC} = this.getLocalTime(day, month, year, timezone);
      const reservation = await this.ReservationRepository.findOne({
        where: {
          start_Time: Between(new Date(startOfDayUTC), new Date(endOfDayUTC)),
          branch: { id: branch },
          order: {
            status: In([OrderStatus.Completed, OrderStatus.Working, OrderStatus.InQueue, OrderStatus.Pending, OrderStatus.Reviewed]),
          }
        },
        relations: {
          branch: true,
          order: true,
        },
      });

      if (reservation) {
        throw new NotFoundException(this.i18n.translate('test.working_hour.reservation_exist', { day, month, year, reservation: reservation.id }));
      }
    }
  }

  formatAndSortTimeArray(times: string[]): string[] {
    return times
      .map(time => {
        let [hour, minute] = time.split(":");
  
        // Convert to numbers for correct sorting
        return { hour: Number(hour), minute: Number(minute) };
      })
      .sort((a, b) => a.hour - b.hour || a.minute - b.minute) // Sort by hour first, then by minute
      .map(({ hour, minute }) => {
        // Format with leading zeros
        return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      });
  };

  async createWorkingBranch(
    branchId: string,
    createWorkingBranchDto: CreateWorkingBranchDto,
    timezone: string,
  ) {

    let { dayOfWeek, workingHours } = createWorkingBranchDto;


    console.log('coming working hours', createWorkingBranchDto.workingHours);

    createWorkingBranchDto.workingHours = this.formatAndSortTimeArray(createWorkingBranchDto.workingHours);


    console.log('new working hours', createWorkingBranchDto.workingHours);

    await this.getNextFourWeeksDatesForDay(
      createWorkingBranchDto.dayOfWeek,
      branchId,
      timezone,
    );

    const times = createWorkingBranchDto.workingHours;

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

    workingHours = createWorkingBranchDto.workingHours.map((result) => {
      return this.getUtcTime(result, timezone);
    });

    console.log('working hours before save', workingHours)
    if (workingBranchEntity) {
      // Update existing WorkingBranchEntity
      workingBranchEntity.workingHours = workingHours;
      workingBranchEntity.clientWorkingHours = times;
      workingBranchEntity.timezone = timezone;
    } else {
      // Create new WorkingBranchEntity
      workingBranchEntity = this.WorkingBranchsRepository.create({
        dayOfWeek: weekDayEnum,
        workingHours,
        branch,
        clientWorkingHours: times,
        timezone,
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
      times,
      timezone,
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

  getLocalTimeFromUtc(utcTime: string, timeZone: string): string {
    // Convert UTC time to the given time zone
    const localTime = DateTime.fromFormat(utcTime, "HH:mm", { zone: "utc" }).setZone(timeZone);
  
    // Return local time in HH:mm format
    return localTime.toFormat("HH:mm");
  }

  async findAll(
    branchId?: string,
    timezone?: string,
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

      for(let i = 0; i < workingBranches.length; i++) {
        workingBranches[i].workingHours = workingBranches[i].workingHours.map((result) => {
          return this.getLocalTimeFromUtc(result, timezone);
        });
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
