import { HttpException, Injectable } from "@nestjs/common";
import { WeekDays } from "../branch/utils/days.enum";
import { CreateSlotDto } from "./dto/create.slot.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkingBranchEntity } from "../working-branch/entities/working.branch.entity";
import { Brackets, MoreThan, MoreThanOrEqual, Repository } from "typeorm";
import { BranchEntity } from "../branch/entities/branch.entity";
import { Role } from "../user/utils/user.enum";
import { UserEntity } from "../user/entities/user.entity";
import { ReservationService } from "../reservation/reservation.service";
import { SlotsEntity } from "./entities/slots.entity";
import { WorkingEntity } from "./entities/working.entity";
import { AvailableQueryDto } from "./dto/query.available.dto";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { OnEvent } from "@nestjs/event-emitter";
// import { Cron, CronExpression } from "@nestjs/schedule";

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
  // @Cron(CronExpression.EVERY_30_SECONDS)
  // async checkSlots() {
  //   const branchs = await this.BranchRepository.find();
  //   console.log(branchs.length);
  //   for (const branch of branchs) {
  //     const today = new Date()
  //     // console.log(today.getDate(), today.getMonth(), today.getFullYear())
  //     const count = await this.SlotRepository.count({
  //       where:{
  //         day: MoreThan(today.getDate()),
  //         month: MoreThanOrEqual(today.getMonth() + 1),
  //         year: MoreThanOrEqual(today.getFullYear()),
  //         branch: {
  //           id: branch.id,
  //         },
  //       },
  //     });
  //     console.log(count, branch.id)
  //     if( count >= 6 ){
  //       continue;
  //     }
  //     const endDate = new Date();
  //     endDate.setDate( endDate.getDate() + count + 4 );
  //     today.setDate( today.getDate() + count + 1 );
  //     console.log(today, endDate, branch.id)
  //     while( today <= endDate ){
  //       const day = this.getDayFromDate(
  //         today.getFullYear(),
  //         today.getMonth() + 1,
  //         today.getDate(),
  //       );
  //       const workingHoursBranch = await this.branchWorkingHours(branch.id, day);
  //       if (!workingHoursBranch) {
  //         today.setDate(today.getDate() + 1);
  //         continue;
  //       }
  //       const body = {
  //         day: today.getDate(),
  //         month: today.getMonth() + 1,
  //         year: today.getFullYear(),
  //         branch: branch.id,
  //         workingHours: workingHoursBranch.workingHours,
  //       };
  //       let slot = this.SlotRepository.create({
  //         day: body.day,
  //         month: body.month,
  //         year: body.year,
  //         branch,
  //       });
  //       // Save the new slot entity
  //       slot = await this.SlotRepository.save(slot);
  //       const artists = await this.artistCount(branch.id);
  //       // Loop through the working hours in pairs (start and end times)
  //       const date = new Date(body.year, body.month - 1, body.day);
  //       const workingEntities = this.createWorkingHoursCalender(
  //         body.workingHours,
  //         date,
  //         slot,
  //         artists,
  //       );
  //       // Save all working entities in a single transaction
  //       const savedWorkingEntities = await this.WorkingRepository.save(workingEntities);
  //       console.log(savedWorkingEntities);
  //       today.setDate(today.getDate() + 1);
  //     }
  //   }
  // }
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
  async artistCount(branchId: string) {
    const artists = await this.EmployeeRepository.find({
      where: {
        role: Role.ARTIST,
        branch: {
          id: branchId,
        },
      },
    });
    return artists;
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
    slot: SlotsEntity,
    artists: EmployeeEntity[],
  ) {
    const workingEntities: WorkingEntity[] = [];
    for (let i = 0; i < workingHours.length; i += 2) {
      // console.log(workingHours[i], workingHours[i + 1]);
      const from = this.createDate(
        nextDate.getFullYear(),
        nextDate.getMonth() + 1,
        nextDate.getDate(),
        workingHours[i],
      );
      let to = this.createDate(
        nextDate.getFullYear(),
        nextDate.getMonth() + 1,
        nextDate.getDate(),
        workingHours[i + 1],
      );
      let duration = Math.floor((to.getTime() - from.getTime()) / (1000 * 60));
      // console.log(duration, artistCount);
      for (let j = 0; j < artists.length; j++) {
        const noOfHours = Math.floor(duration / 60);
        if( artists[j].workingHours <= 0 ){
          continue;
        }
        const time = artists[j].workingHours - noOfHours;
        if ( time < 0) {
          to = new Date(from.getTime() + artists[j].workingHours * 3600 * 1000);
          duration = Math.floor((to.getTime() - from.getTime()) / (1000 * 60));
          artists[j].workingHours = 0;
        }
        artists[j].workingHours = time;
        const workingEntity = this.WorkingRepository.create({
          from,
          to,
          slot: slot,
          duration,
        });
        workingEntities.push(workingEntity);
      }
    }
    // console.log(workingEntities);
    return workingEntities;
  }
  createWorkingHoursSlotsForArtist(
    workingHours: string[],
    nextDate: Date,
    slot: SlotsEntity,
    artist: EmployeeEntity,
  ) {
    let workingHoursOfEmployees = artist.workingHours;
    const workingEntities: WorkingEntity[] = [];
    for (let i = 0; i < workingHours.length; i += 2) {
      // console.log(workingHours[i], workingHours[i + 1]);
      const from = this.createDate(
        nextDate.getFullYear(),
        nextDate.getMonth() + 1,
        nextDate.getDate(),
        workingHours[i],
      );
      let to = this.createDate(
        nextDate.getFullYear(),
        nextDate.getMonth() + 1,
        nextDate.getDate(),
        workingHours[i + 1],
      );
      let duration = Math.floor((to.getTime() - from.getTime()) / (1000 * 60));
      const noOfHours = Math.floor(duration / 60);
      if( workingHoursOfEmployees <= 0 ){
        break;
      }
      let time = workingHoursOfEmployees - noOfHours;
      if ( time < 0) {
        to = new Date(from.getTime() + workingHoursOfEmployees * 3600 * 1000);
        duration = Math.floor((to.getTime() - from.getTime()) / (1000 * 60));
        time = 0;
      }
      workingHoursOfEmployees = time;
      const workingEntity = this.WorkingRepository.create({
        from,
        to,
        slot: slot,
        duration,
      });
      console.log(workingEntity);
      workingEntities.push(workingEntity);
    }
    // console.log(workingEntities);
    return workingEntities;
  }
  createDate(year: number, month: number, day: number, time: string) {
    const [hour, minute] = time.split(":");
    return new Date( Date.UTC( year, month - 1, day, parseInt(hour, 10), parseInt(minute, 10), )
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
  @OnEvent('artist:created')
  async createSlotsForArtist(artist: EmployeeEntity) {
    const today = new Date();
    let loopOn = true;
    while (loopOn) {
      const slot = await this.SlotRepository.findOne({
        where: {
          day: today.getDate(),
          month: today.getMonth() + 1,
          year: today.getFullYear(),
          branch: {
            id: artist.branch.id,
          },
        },
      });
      // console.log(slot);
      const day = this.getDayFromDate(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate(),
      );
      if (!slot) {
        const count = await this.SlotRepository.count({
          where:{
            day: MoreThan(today.getDate()),
            month: MoreThanOrEqual(today.getMonth() + 1),
            year: MoreThanOrEqual(today.getFullYear()),
            branch: {
              id: artist.branch.id,
            },
          },
        });
        if (count === 0) {
          loopOn = false;
          continue;
        }
        continue;
      }
      const workingHours = (
        await this.branchWorkingHours(artist.branch.id, day)
      ).workingHours;
      const workingEntities = this.createWorkingHoursSlotsForArtist(
        workingHours,
        today,
        slot,
        artist,
      );
      // console.log(workingEntities);
      await this.WorkingRepository.save(workingEntities);
      // console.log(workingEntities);
      today.setDate(today.getDate() + 1);
    }
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
    const artists = await this.artistCount(branch.id);
    // Loop through the working hours in pairs (start and end times)
    const date = new Date(body.year, body.month - 1, body.day);
    const workingEntities = this.createWorkingHoursCalender(
      body.workingHours,
      date,
      // artists.length,
      slot,
      artists,
    );
    // Save all working entities in a single transaction
    const savedWorkingEntities =
      await this.WorkingRepository.save(workingEntities);
    console.log(savedWorkingEntities);
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
      let currentStartTime = new Date(from) > new Date() ? new Date(from) : new Date( Date.now() + (5* 60 * 1000) ); // Start at the provided startTime
      console.log(currentStartTime, new Date());
      const currentEndTime = new Date(to); // End at the provided endTime

      // Loop through the interval and create slots of the given duration
      while (currentStartTime < currentEndTime) {
        const nextSlotEnd = new Date(
          currentStartTime.getTime() + duration * 1000 * 60,
        );
        // console.log(nextSlotEnd , currentEndTime, currentStartTime, duration);

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
        // console.log(result);

        // Move the currentStartTime to the next slot's start time
        currentStartTime = nextSlotEnd;
      }
    });
    console.log(result);
    return result;
  }
  // async getAllAvailableSlots(
  //   branchId: string,
  //   { day, month, year, duration }: AvailableQueryDto,
  // ) {
  //   const slots = await this.WorkingRepository.createQueryBuilder('working')
  //     .leftJoinAndSelect('working.slot', 'slot')
  //     .leftJoinAndSelect('slot.branch', 'branch')
  //     .where('slot.branch.id = :branchId', { branchId })
  //     .andWhere('slot.day = :day', { day })
  //     .andWhere('slot.year = :year', { year })
  //     .andWhere('slot.month = :month', { month })
  //     .andWhere(new Brackets(qb => {
  //       qb.where('working.from >= :currentDate', { currentDate: new Date() })
  //       .orWhere('working.to >= :currentDate', { currentDate: new Date() });
  //     }))
  //     .orderBy('working.from', 'ASC')
  //     .getMany();
  //   if (slots.length === 0) {
  //     return [];
  //   }
  //   console.log(slots)
  //   return this.createTimeSlots(slots, duration);
  // }

  async getAllAvailableSlots(
    branchId: string,
    { day, month, year, duration }: AvailableQueryDto,
  ) {
    const slots = await this.WorkingRepository.createQueryBuilder('working')
      .leftJoinAndSelect('working.slot', 'slot')
      .leftJoinAndSelect('slot.branch', 'branch')
      .where('slot.branch.id = :branchId', { branchId })
      .andWhere('slot.day = :day', { day })
      .andWhere('slot.year = :year', { year })
      .andWhere('slot.month = :month', { month })
      .andWhere(new Brackets(qb => {
        qb.where('working.from >= :currentDate', { currentDate: new Date() })
        .orWhere('working.to >= :currentDate', { currentDate: new Date() });
      }))
      .orderBy('working.from', 'ASC')
      .getMany();
    if (slots.length === 0) {
      return [];
    }
    // console.log(slots)
    return this.createTimeSlots(slots, duration);
  }
  // async getFirstSlotAvailable(branchId: string, ids: string[]) {
  //   const { duration } =
  //     await this.reservationService.calculateTotalDuration(ids);
  //     const workingHour = await this.WorkingRepository.createQueryBuilder('working')
  //     .leftJoinAndSelect('working.slot', 'slot')
  //     .leftJoinAndSelect('slot.branch', 'branch')
  //     .where('slot.branch.id = :branchId', { branchId })
  //     .andWhere('working.duration >= :duration', { duration })
  //     .andWhere(new Brackets(qb => {
  //       qb.where('working.from >= :currentDate', { currentDate: new Date() })
  //         .orWhere('working.to >= :currentDate', { currentDate: new Date() });
  //     }))
  //     .orderBy('slot.year', 'ASC')
  //     .addOrderBy('slot.month', 'ASC')
  //     .addOrderBy('slot.day', 'ASC')
  //     .addOrderBy('working.from', 'ASC')
  //     .getOne();
  //   if (!workingHour) {
  //     throw new HttpException("No available slots found.", 400);
  //   }
  //   return this.createTimeSlots([workingHour], duration)[0] || null;
  // }




  async getFirstSlotAvailable(
    branchId: string,
    serviceIds?: string[],
    rootoshIds?: string[]
  ) {
    // Check if both are provided
    if (serviceIds.length > 0 && rootoshIds.length > 0) {
      throw new HttpException("Please provide either services or rootosh IDs, not both.", 400);
    }
  
    // Check if neither is provided
    if (serviceIds.length === 0 && rootoshIds.length === 0) {
      throw new HttpException("At least one of services or rootosh IDs must be provided.", 400);
    }
  
    if (serviceIds.length > 0) {
      // Calculate duration based on services
      const { duration } = await this.reservationService.calculateTotalDuration(serviceIds);
  
      const workingHour = await this.WorkingRepository.createQueryBuilder('working')
        .leftJoinAndSelect('working.slot', 'slot')
        .leftJoinAndSelect('slot.branch', 'branch')
        .where('slot.branch.id = :branchId', { branchId })
        .andWhere('working.duration >= :duration', { duration })
        .andWhere(new Brackets(qb => {
          qb.where('working.from >= :currentDate', { currentDate: new Date() })
            .orWhere('working.to >= :currentDate', { currentDate: new Date() });
        }))
        .orderBy('slot.year', 'ASC')
        .addOrderBy('slot.month', 'ASC')
        .addOrderBy('slot.day', 'ASC')
        .addOrderBy('working.from', 'ASC')
        .getOne();
  
      if (!workingHour) {
        throw new HttpException("No available slots found for the given services.", 400);
      }
  
      return this.createTimeSlots([workingHour], duration)[0] || null;
    }
  
    if (rootoshIds.length > 0) {
      // Calculate duration based on rootosh
      const { duration } = await this.reservationService.calculateRootoshTotalDuration(rootoshIds);
  
      const workingHour = await this.WorkingRepository.createQueryBuilder("working")
        .leftJoinAndSelect("working.slot", "slot")
        .leftJoinAndSelect("slot.branch", "branch")
        .where("slot.branch.id = :branchId", { branchId })
        .andWhere("working.duration >= :duration", { duration })
        .andWhere(
          new Brackets((qb) => {
            qb.where("working.from >= :currentDate", {
              currentDate: new Date(),
            }).orWhere("working.to >= :currentDate", {
              currentDate: new Date(),
            });
          })
        )
        .orderBy("slot.year", "ASC")
        .addOrderBy("slot.month", "ASC")
        .addOrderBy("slot.day", "ASC")
        .addOrderBy("working.from", "ASC")
        .getOne();
  
      if (!workingHour) {
        throw new HttpException("No available slots found for the given rootosh IDs.", 400);
      }
      return this.createTimeSlots([workingHour], duration)[0] ?? null;
    }
  
    throw new HttpException("Either services or rootosh IDs must be provided.", 400);
  }
}
 