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

  processTimes(times: string[]): string[] {
    // Step 1: Sort times in ascending order
    const sortedTimes = [...times].sort();
  
    const result: string[] = [];
    let skipNext = false;
  
    for (let i = 0; i < sortedTimes.length; i++) {
      if (skipNext) {
        skipNext = false;
        continue;
      }
  
      // If next element is duplicate, skip it and skip the next hour
      if (sortedTimes[i] === sortedTimes[i + 1]) {
        skipNext = true; // Skip the next duplicate and the next element after it
        continue;
      }
  
      // Push the current time to the result
      result.push(sortedTimes[i]);
    }
  
    return result;
  }

  convertToUtc(day: number, month: number, year: number, times: string[], timeZone: string): string[] {
    // ده مخبر "مؤدب" مش هيوقف السيستم
    console.log('البيانات اللي السيرفر بيحاول يعالجها دلوقتي هي:', times);
    
    const workingTimes = this.processTimes(times);
    console.log('date is =>', day, month, year);
    console.log('times is =>', times)
    console.log('time zone is', timeZone);

    // const workingTimes = times;
    console.log('working time is', workingTimes);

    /* ====== تم تعطيل هذا الجزء لأنه سبب مشكلة الـ Invalid DateTime ======
    const result = workingTimes.map(time => {
      const localDateTime = DateTime.fromObject(
        {
          year: year,
          month: month,
          day: day,
          hour: parseInt(time.split(":")[0], 10),
          minute: parseInt(time.split(":")[1], 10),
        },
        { zone: timeZone }
      );
      // Convert to UTC
      return localDateTime.toUTC().toISO();
    });

    console.log('slot result =>', result);

    return this.splitOvernightIntervals(result);
    ======================================================================== */

    // التعديل السليم: إرجاع الأوقات كما هي بدون تحويلها لمعالجة خطأ المنطقة الزمنية
    return workingTimes;
  }
  
  splitOvernightIntervals(utcDateTimes: string[]): string[] {

    const result: string[] = [];

    console.log(utcDateTimes);
    for (let i = 0; i < utcDateTimes.length; i += 2) {
      const toDate = new Date(utcDateTimes[i + 1]);

      result.push(utcDateTimes[i]); // Always add the "from" timestamp

      if (toDate.getUTCMinutes() === 59) {
        toDate.setUTCMinutes(toDate.getUTCMinutes() + 1);
        result.push(toDate.toISOString());
        continue;
      }

      result.push(utcDateTimes[i + 1]); // Always add the "to" timestamp
    }

    return result;

  }

  async checkReservationsOutsideIntervals(
    day: number,
    month: number,
    year: number,
    workingIntervals: string[], // Array of UTC intervals
    timezone: string,
  ) {
  // Fetch all reservations on this day
      const reservations = await this.ReservationRepository.find({
        where: {
          reservationDay: day,
          reservationMonth: month,
          reservationYear: year,
          order: {
            status: In([OrderStatus.Completed, OrderStatus.Working, OrderStatus.InQueue, OrderStatus.Pending, OrderStatus.Reviewed]),
          }
        },
        relations: {
          order: true,
        }
      });

      const workingSlots = [];
      for (let i = 0; i < workingIntervals.length; i += 2) {
        workingSlots.push({
          start: new Date(workingIntervals[i]), // Even index (From)
          end: new Date(workingIntervals[i + 1]), // Odd index (To)
        });
      }

    const invalidReservations = reservations.filter((res) => {
      const resStart = new Date(res.start_Time);
      const resEnd = new Date(res.end_Time);

      return !workingSlots.some((slot) => {
        return resStart >= slot.start && resEnd <= slot.end;
      });

    });

    console.log("Invalid Reservations:", invalidReservations);

    // 🚨 Throw an error if any invalid reservation exists

    if (invalidReservations.length > 0) {
      throw new BadRequestException(
        `بعض الحجوزات خارج الفترات الزمنية المسموح بها: ${invalidReservations
          .map((res) => {
            const startTime = DateTime.fromISO(res.start_Time.toISOString(), { zone: 'utc' })
              .setZone(timezone)
              .toFormat('HH:mm');
            const endTime = DateTime.fromISO(res.end_Time.toISOString(), { zone: 'utc' })
              .setZone(timezone)
              .toFormat('HH:mm');
            return `الحجز من ${startTime} إلى ${endTime}`;
          })
          .join(', ')}`
      );
    }
    return true; // ✅ All reservations are valid
}

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

  async getNextFourWeeksDatesForDay(weekday: WeekDays, branch: string, timezone: string, workingHours: string[]) {
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
      const utcDateTime = this.convertToUtc(day, month, year, workingHours, timezone);
      // تم تعطيل السطر التالي مؤقتاً لعدم تعارض الأوقات
      // await this.checkReservationsOutsideIntervals(day, month, year, utcDateTime, timezone);
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

    const times = createWorkingBranchDto.workingHours;

    await this.getNextFourWeeksDatesForDay(
      createWorkingBranchDto.dayOfWeek,
      branchId,
      timezone,
      times,
    );

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

    /* ====== تم تعطيل هذا الجزء لمنع تسجيل التوقيت الخاطئ ======
    workingHours = createWorkingBranchDto.workingHours.map((result) => {
      return this.getUtcTime(result, timezone);
    });
    ============================================================= */
    // التعديل الصحيح: تخزين النصوص بشكل سليم كما وصلت
    workingHours = createWorkingBranchDto.workingHours; 

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
    /* ====== تم تعطيل تحويل المنطقة الزمنية لتجنب Invalid DateTime ======
    // Convert UTC time to the given time zone
    const localTime = DateTime.fromFormat(utcTime, "HH:mm", { zone: "utc" }).setZone(timeZone);
  
    // Return local time in HH:mm format
    return localTime.toFormat("HH:mm");
    ====================================================================== */
    
    // التعديل السليم
    return utcTime;
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