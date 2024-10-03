import { HttpException, Injectable } from "@nestjs/common";
import { WeekDays } from "../branch/utils/days.enum";
import { CreateSlotDto } from "./dto/create.slot.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkingBranchEntity } from "../working-branch/entities/working.branch.entity";
import { MoreThanOrEqual, Repository } from "typeorm";
import { BranchEntity } from "../branch/entities/branch.entity";
import { Role } from "../user/utils/user.enum";
import { UserEntity } from "../user/entities/user.entity";
import { ReservationService } from "../reservation/reservation.service";
import { SlotsEntity } from "./entities/slots.entity";
import { WorkingEntity } from "./entities/working.entity";
import { AvailableQueryDto } from "./dto/query.available.dto";
import { EmployeeEntity } from "../employee/entities/employee.entity";

@Injectable()
export class SlotService {
  constructor(
    @InjectRepository(WorkingBranchEntity)
    private readonly WorkingBranchRepository: Repository<WorkingBranchEntity>,
    @InjectRepository(BranchEntity)
    private readonly BranchRepository: Repository<BranchEntity>,
    @InjectRepository(SlotsEntity)
    private readonly SlotRepository: Repository<SlotsEntity>,
    @InjectRepository(WorkingEntity)
    private readonly WorkingRepository: Repository<WorkingEntity>,
    @InjectRepository(UserEntity)
    private readonly UserRepository: Repository<UserEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly EmployeeRepository: Repository<EmployeeEntity>,
    private reservationService: ReservationService,
  ) {}
  async getNextFourWeeksDatesForDay(
    weekday: WeekDays,
    branch: string,
    workingHours: string[],
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
      await this.createSlot({ day, year, month, branch, workingHours });
    }
  }
  artistCount(branchId: string) {
    return this.EmployeeRepository.countBy({
      role: Role.ARTIST,
      branch: {
        id: branchId,
      },
    });
  }
  branchWorkingHours(branchId: string, dayOfWeek: WeekDays) {
    return this.WorkingBranchRepository.findOne({
      where: {
        branch: { id: branchId },
        dayOfWeek,
      },
    });
  }
  createWorkingHoursCalender(
    workingHours: string[],
    nextDate: Date,
    artistCount: number,
    slot: SlotsEntity,
  ) {
    const workingEntities: WorkingEntity[] = [];
    for (let i = 0; i < workingHours.length; i += 2) {
      console.log(workingHours[i], workingHours[i + 1]);
      const from = this.createDate(
        nextDate.getFullYear(),
        nextDate.getMonth() + 1,
        nextDate.getDate(),
        workingHours[i],
      );
      const to = this.createDate(
        nextDate.getFullYear(),
        nextDate.getMonth() + 1,
        nextDate.getDate(),
        workingHours[i + 1],
      );
      const duration = Math.floor(
        (to.getTime() - from.getTime()) / (1000 * 60),
      );
      console.log(duration, artistCount);
      for (let j = 0; j < artistCount; j++) {
        const workingEntity = this.WorkingRepository.create({
          from,
          to,
          slot: slot,
          duration,
        });
        workingEntities.push(workingEntity);
      }
    }
    return workingEntities;
  }
  createDate(year: number, month: number, day: number, time: string) {
    const [hour, minute] = time.split(":");
    return new Date(
      year,
      month - 1,
      day,
      parseInt(hour, 10),
      parseInt(minute, 10),
    );
  }
  getDayFromDate(year: number, month: number, day: number) {
    const date = new Date(year, month - 1, day);
    const daysOfWeek = [
      WeekDays.Sunday,
      WeekDays.Monday,
      WeekDays.Tuesday,
      WeekDays.Wednesday,
      WeekDays.Thursday,
      WeekDays.Friday,
      WeekDays.Saturday,
    ];
    const dayIndex = date.getDay();
    return daysOfWeek[dayIndex];
  }
  async createSlot(body: CreateSlotDto) {
    // Get the day of the week for the provided date
    // const dayOfWeek = this.getDayFromDate(body.year, body.month, body.day);
    const branch = await this.BranchRepository.findOneBy({ id: body.branch });
    // Find the working branch details for the given day and branch
    // const workingBranch = await this.branchWorkingHours(branch.id, dayOfWeek);

    // if (!workingBranch) {
    //   throw new Error(
    //     "Working hours for the selected branch and day not found.",
    //   );
    // }
    let slot = await this.SlotRepository.findOne({
      where: {
        day: body.day,
        month: body.month,
        year: body.year,
        branch: { id: body.branch },
      },
      relations: {
        workingEntity: true,
      },
    });
    if (slot) {
      await this.SlotRepository.remove(slot);
    }

    // If no slot exists, create a new one
    slot = this.SlotRepository.create({
      day: body.day,
      month: body.month,
      year: body.year,
      branch,
    });
    // Save the new slot entity
    slot = await this.SlotRepository.save(slot);
    const artistCount = await this.artistCount(branch.id);
    // Loop through the working hours in pairs (start and end times)
    const date = new Date(body.year, body.month - 1, body.day);
    const workingEntities = this.createWorkingHoursCalender(
      body.workingHours,
      date,
      artistCount,
      slot,
    );
    // Save all working entities in a single transaction
    const savedWorkingEntities =
      await this.WorkingRepository.save(workingEntities);
    console.log("slot saved");
    // return {
    //   message: "Slot created successfully",
    //   day: slot.day,
    //   month: slot.month,
    //   year: slot.year,
    //   calender: savedWorkingEntities,
    // };
  }

  createTimeSlots(intervals: { from: Date; to: Date }[], duration: number) {
    const result = [];

    intervals.map(({ from, to }) => {
      let currentStartTime = new Date(from); // Start at the provided startTime
      const currentEndTime = new Date(to); // End at the provided endTime

      // Loop through the interval and create slots of the given duration
      while (currentStartTime < currentEndTime) {
        const nextSlotEnd = new Date(
          currentStartTime.getTime() + duration * 1000 * 60,
        );

        // Ensure that we don't exceed the endTime
        if (nextSlotEnd > currentEndTime) {
          break; // Stop if the next slot exceeds the endTime
        }
        const obj = {
          startTime: currentStartTime,
          endTime: nextSlotEnd,
        };

        const idx = result.findIndex(
          ({ startTime }) => startTime.getTime() == obj.startTime.getTime(),
        );
        if (idx == -1) {
          result.push(obj);
        }
        console.log(result);

        // Move the currentStartTime to the next slot's start time
        currentStartTime = nextSlotEnd;
      }
    });
    return result;
  }
  async getAllAvailableSlots(
    branchId: string,
    { day, month, year, duration }: AvailableQueryDto,
  ) {
    const slots = await this.WorkingRepository.find({
      where: {
        slot: {
          branch: { id: branchId },
          day: day,
          year: year,
          month: month,
        },
      },
      relations: { slot: { branch: true } },
      order: {
        from: "ASC",
      },
    });
    if (slots.length === 0) {
      return [];
    }
    return this.createTimeSlots(slots, duration);
  }
  async getFirstSlotAvailable(branchId: string, ids: string[]) {
    const { duration } =
      await this.reservationService.calculateTotalDuration(ids);
    const workingHour = await this.WorkingRepository.findOne({
      where: {
        slot: {
          branch: { id: branchId },
        },
        from : MoreThanOrEqual( new Date() ),
        duration: MoreThanOrEqual(duration),
      },
      relations: { slot: { branch: true } },
      order: {
        slot: {
          year: "ASC",
          month: "ASC",
          day: "ASC",
        },
        from: "ASC",
      },
    });
    if (!workingHour) {
      throw new HttpException("No available slots found.", 400);
    };
    return this.createTimeSlots([workingHour], duration)[0] || null;
  }
}