import { HttpException, Injectable } from "@nestjs/common";
import { WeekDays } from "../branch/utils/days.enum";
import { CreateSlotDto } from "./dto/create.slot.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkingBranchEntity } from "../working-branch/entities/working.branch.entity";
import { Brackets, Repository } from "typeorm";
import { BranchEntity } from "../branch/entities/branch.entity";
import { Role } from "../user/utils/user.enum";
import { ReservationService } from "../reservation/reservation.service";
import { SlotsEntity } from "./entities/slots.entity";
import { WorkingEntity } from "./entities/working.entity";
import { AvailableQueryDto } from "./dto/query.available.dto";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { DateTime } from 'luxon';
import { ReservationEntity } from "src/reservation/entities/reservation.entity";

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
    @InjectRepository(EmployeeEntity)
    private readonly EmployeeRepository: Repository<EmployeeEntity>,
    private reservationService: ReservationService,
    @InjectRepository(ReservationEntity)
    private readonly ReservationRepository: Repository<ReservationEntity>,
  ) {}

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
    console.log('date is =>', day, month, year);
    console.log('times is =>', times)
    console.log('time zone is', timeZone);

    const workingTimes = this.processTimes(times);

    // const workingTimes = times;
    console.log('working time is', workingTimes);

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
  }

  async getNextFourWeeksDatesForDay(
    weekday: WeekDays,
    branch: string,
    workingHours: string[],
    timezone: string,
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
      nextDate.setUTCHours(0,0,0,0);
      nextDate.setDate(today.getDate() + daysToAdd + i * 7);

      resultDates.push({
        day: nextDate.getUTCDate(),
        year: nextDate.getUTCFullYear(),
        month: nextDate.getUTCMonth() + 1,
      });

    }
    for (const { day, year, month } of resultDates) {
      await this.createSlot({ day, year, month, branch, workingHours }, timezone);
      console.log('this is day an d', day, year, month);
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

  getLocalHour(utcTime: string, timeZone: string): string {
    // Convert UTC time to local time
    const localTime = DateTime.fromISO(utcTime, { zone: 'utc' }).setZone(timeZone);
    // Return the hour in HH:mm format
    return localTime.toFormat('HH:mm');
  }

  async getSlotForDay(day: Date, branch: BranchEntity) {
    let slot = await this.SlotRepository.findOne({
      where: {
        day: day.getUTCDate(),
        month: day.getUTCMonth() + 1,
        year: day.getUTCFullYear(),
        branch: {
          id: branch.id,
        }
      },
    });

    if(!slot){
      slot = this.SlotRepository.create({
        day: day.getUTCDate(),
        month: day.getUTCMonth() + 1,
        year: day.getUTCFullYear(),
        branch
      });
  
      // Save the new slot entity
      slot = await this.SlotRepository.save(slot);
    }
    return slot;
  }


  getLocalTime(day: number, month: number, year: number, timezone: string) {
    // Create the date in the specified timezone
    console.log('day month year logs', day , month, year);
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

  async createWorkingHoursCalender(
    workingHours: string[],
    day: number,
    month: number,
    year: number,
    artists: EmployeeEntity[],
    branch: BranchEntity,
    timezone: string,
  ) {
    workingHours = this.convertToUtc(day, month, year, workingHours, timezone);

    console.log(workingHours);

    const workingEntities: WorkingEntity[] = [];
    for (let i = 0; i < workingHours.length; i += 2) {

      let from = new Date(workingHours[i]);

      console.log('working[i] is', workingHours[i]);
      console.log('from time is', from);

      console.log('artist base time is', artists[0].workingHours);

      let to = new Date(workingHours[i + 1]);

      let duration = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60));

      if(duration <= 0){
        continue;
      }

      const slot = await this.getSlotForDay(from, branch);

      // console.log(duration, artistCount);
      for (let j = 0; j < artists.length; j++) {
        const noOfHours = Math.floor(duration / 60);
        if (artists[j].workingHours <= 0) {
          continue;
        }
        let time = artists[j].workingHours - noOfHours;

        if (time < 0) {
          to = new Date(from.getTime() + artists[j].workingHours * 3600 * 1000);
          duration = Math.floor((to.getTime() - from.getTime()) / (1000 * 60));
          // artists[j].workingHours = 0;
          time = 0;
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

    console.log(workingEntities);

    return workingEntities;
  }

  // async createWorkingHoursCalender(
  //   workingHours: string[],
  //   day: number,
  //   month: number,
  //   year: number,
  //   artists: EmployeeEntity[],
  //   branch: BranchEntity,
  //   timezone: string,
  // ) {
  //   workingHours = this.convertToUtc(day, month, year, workingHours, timezone);

  //   const workingEntities: WorkingEntity[] = [];

  //   for (let i = 0; i < workingHours.length; i += 2) {

  //     let from = new Date(workingHours[i]);

  //     console.log('working[i] is', workingHours[i]);
  //     console.log('from time is', from);

  //     console.log('artist base time is', artists[0].workingHours);

  //     let to = new Date(workingHours[i + 1]);

  //     let duration = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60));

  //     if(duration <= 0){
  //       continue;
  //     }

  //     const slot = await this.getSlotForDay(from, branch);

  //     const reservations = await this.ReservationRepository.createQueryBuilder('reservation')
  //       .leftJoinAndSelect('reservation.branch', 'branch')
  //       .where('branch.id = :id', { id: branch.id })
  //       .where(
  //         '(reservation.start_Time < :endTime AND reservation.end_Time > :startTime)', 
  //         { startTime: workingHours[i], endTime: workingHours[i+1] }
  //       )
  //       .getMany();

  //     for (let j = 0; j < artists.length; j++) {

  //       if (artists[j].workingHours <= 0) {
  //         continue;
  //       }

  //       let reservationHours = 0;

  //       const index = reservations.findIndex((value)=>{
  //         reservationHours = Math.floor((new Date(value.end_Time).getTime() - new Date(value.start_Time).getTime()) / 1000 * 60 * 60);
  //         return artists[j].workingHours >= duration;
  //       });

  //       let intervals = [];
  //       let totalDuration = 0;

  //       if(index > -1) {
  //         intervals = this.splitIntervals(
  //           new Date(workingHours[i]),
  //           new Date(workingHours[i+1]),
  //           new Date(reservations[index].start_Time),
  //           new Date(reservations[index].end_Time),
  //         )
  //         intervals.forEach((value)=>{
  //           totalDuration += value.duration;
  //         })
  //         reservations.splice(index, 1);
  //       } else {
  //         totalDuration = duration;
  //         intervals.push({
  //           from,
  //           to,
  //           duration,
  //         })
  //       }

  //       if(totalDuration == 0) {
  //         artists[j].workingHours = artists[j].workingHours - reservationHours;
  //         continue;
  //       }

  //       const noOfHours = Math.floor(totalDuration / 60);

  //       let time = artists[j].workingHours - noOfHours;

  //       if (time < 0) {
  //         // If remaining artist hours are less than required, adjust the last interval

  //         let remainingMinutes = artists[j].workingHours * 60;
  //         let adjustedIntervals: { from: Date; to: Date; duration: number }[] = [];
  //         let usedMinutes = 0;
  
  //         for (const interval of intervals) {
  //           if (usedMinutes + interval.duration <= remainingMinutes) {
  //             // If we have enough time, keep the whole interval
  //             adjustedIntervals.push(interval);
  //             usedMinutes += interval.duration;
  //           } else {
  //             // Trim the interval to fit the remaining artist hours
  //             let newTo = new Date(interval.from.getTime() + (remainingMinutes - usedMinutes) * 60000);
  //             let newDuration = Math.floor((newTo.getTime() - interval.from.getTime()) / (1000 * 60));
  
  //             if (newDuration > 0) {
  //               adjustedIntervals.push({
  //                 from: interval.from,
  //                 to: newTo,
  //                 duration: newDuration,
  //               });
  //             }
  //             break;
  //           }
  //         }
  
  //         intervals = adjustedIntervals;
  //         time = 0; // Artist has no remaining hours after this
  //       }

  //       artists[j].workingHours = time;

  //       intervals.forEach((value)=>{
  //         const workingEntity = this.WorkingRepository.create({
  //           from: value.from,
  //           to: value.to,
  //           slot: slot,
  //           duration: value.duration,
  //         });
  //         workingEntities.push(workingEntity);
  //       })
  //     }
  //   }

  //   console.log(workingEntities);

  //   return workingEntities;
  // }
  splitIntervals(
    fromOriginal: Date,
    toOriginal: Date,
    fromReservation: Date,
    toReservation: Date
  ) {
    const intervals = [];
  
    // If reservation starts after the original interval's start, keep the first part
    if (fromReservation > fromOriginal) {
      const duration = Math.floor(new Date(fromReservation).getTime() - fromOriginal.getTime() / 1000 * 60);
      intervals.push({ from: fromOriginal, to: new Date(fromReservation), duration });
    }
  
    // If reservation ends before the original interval's end, keep the last part
    if (toReservation < toOriginal) {
      const duration = Math.floor(new Date(toReservation).getTime() - toOriginal.getTime() / 1000 * 60);
      intervals.push({ from: new Date(toReservation), to: toOriginal, duration });
    }
  
    return intervals;
  }
  
  // @OnEvent("artist:created")
  // async createSlotsForArtist(artist: EmployeeEntity) {
  //   const today = new Date();
  //   let loopOn = true;
  //   // console.log(artist)
  //   while (loopOn) {
  //     console.log(today.getDate(), today.getMonth() + 1, today.getFullYear());
  //     const slot = await this.SlotRepository.findOne({
  //       where: {
  //         day: today.getUTCDate(),
  //         month: today.getUTCMonth() + 1,
  //         year: today.getFullYear(),
  //         branch: {
  //           id: artist.branch.id,
  //         },
  //       },
  //       relations: ["branch"],
  //     });
  //     // console.log(slot);
  //     const day = this.getDayFromDate(
  //       today.getFullYear(),
  //       today.getMonth() + 1,
  //       today.getDate(),
  //     );
  //     if (!slot) {
  //       const count = await this.SlotRepository.count({
  //         where: {
  //           day: MoreThan(today.getDate()),
  //           month: MoreThanOrEqual(today.getMonth() + 1),
  //           year: MoreThanOrEqual(today.getFullYear()),
  //           branch: {
  //             id: artist.branch.id,
  //           },
  //         },
  //       });
  //       // console.log(count);
  //       if (count === 0) {
  //         loopOn = false;
  //         continue;
  //       }
  //       today.setDate(today.getDate() + 1);
  //       continue;
  //     }
  //     const workingHours = (
  //       await this.branchWorkingHours(artist.branch.id, day)
  //     ).workingHours;
  
  //     const workingEntities = this.createWorkingHoursSlotsForArtist(
  //       workingHours,
  //       today,
  //       slot,
  //       artist,
  //     );

  //     // console.log(workingEntities);
  //     await this.WorkingRepository.save(workingEntities);
  //     today.setDate(today.getDate() + 1);
  //   }
  // }
  // createWorkingHoursSlotsForArtist(
  //   workingHours: string[],
  //   nextDate: Date,
  //   slot: SlotsEntity,
  //   artist: EmployeeEntity,
  // ) {
  //   let workingHoursOfEmployees = artist.workingHours;
  //   const workingEntities: WorkingEntity[] = [];
  //   for (let i = 0; i < workingHours.length; i += 2) {
  //     // console.log(workingHours[i], workingHours[i + 1]);
  //     const from = this.createDate(
  //       nextDate.getFullYear(),
  //       nextDate.getMonth() + 1,
  //       nextDate.getDate(),
  //       workingHours[i],
  //     );
  //     let to = this.createDate(
  //       nextDate.getFullYear(),
  //       nextDate.getMonth() + 1,
  //       nextDate.getDate(),
  //       workingHours[i + 1],
  //     );
  //     let duration = Math.floor((to.getTime() - from.getTime()) / (1000 * 60));
  //     const noOfHours = Math.floor(duration / 60);
  //     if (workingHoursOfEmployees <= 0) {
  //       break;
  //     }
  //     let time = workingHoursOfEmployees - noOfHours;
  //     if (time < 0) {
  //       to = new Date(from.getTime() + workingHoursOfEmployees * 3600 * 1000);
  //       duration = Math.floor((to.getTime() - from.getTime()) / (1000 * 60));
  //       time = 0;
  //     }
  //     workingHoursOfEmployees = time;
  //     const workingEntity = this.WorkingRepository.create({
  //       from,
  //       to,
  //       slot: slot,
  //       duration,
  //     });
  //     console.log(workingEntity);
  //     workingEntities.push(workingEntity);
  //   }
  //   // console.log(workingEntities);
  //   return workingEntities;
  // }
  // createDate(year: number, month: number, day: number, time: string) {
  //   const [hour, minute] = time.split(":");
  //   return new Date(
  //     Date.UTC(year, month - 1, day, parseInt(hour, 10), parseInt(minute, 10)),
  //   );
  // }
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
  // @OnEvent("artist:hours")
  // async removeWorkingHours({ duration, branchId }) {
  //   const today = new Date();
  //   let loopOn = true;
  //   while (loopOn) {
  //     const slot = await this.SlotRepository.findOne({
  //       where: {
  //         day: today.getDate(),
  //         month: today.getMonth() + 1,
  //         year: today.getFullYear(),
  //         branch: {
  //           id: branchId,
  //         },
  //       },
  //       relations: ["branch", "workingEntity"],
  //     });
  //     if (!slot) {
  //       const count = await this.SlotRepository.count({
  //         where: {
  //           day: MoreThan(today.getDate()),
  //           month: MoreThanOrEqual(today.getMonth() + 1),
  //           year: MoreThanOrEqual(today.getFullYear()),
  //           branch: {
  //             id: branchId,
  //           },
  //         },
  //       });
  //       if (count === 0) {
  //         loopOn = false;
  //         continue;
  //       }
  //       continue;
  //     }
  //     let sum = 0;
  //     const ids = [];
  //     for (const wE of slot.workingEntity) {
  //       if (wE.duration == duration) {
  //         await this.WorkingRepository.remove(wE);
  //         break;
  //       }
  //       if (wE.duration >= duration) {
  //         wE.from = new Date(duration * 1000 * 60 + wE.from.getTime());
  //         await this.WorkingRepository.save(wE);
  //         break;
  //       }
  //       sum += wE.duration;
  //       ids.push(wE.id);
  //       if (sum == duration) {
  //         await this.WorkingRepository.delete({ id: In(ids) });
  //         break;
  //       }
  //       if (sum > duration) {
  //         wE.from = new Date((sum - duration) * 1000 * 60 + wE.from.getTime());
  //         await this.WorkingRepository.save(wE);
  //         ids.pop();
  //         await this.WorkingRepository.delete({ id: In(ids) });
  //         break;
  //       }
  //     }
  //     today.setDate(today.getDate() + 1);
  //   }
  // }
  async createSlot(body: CreateSlotDto, timezone: string) {
    const branch = await this.BranchRepository.findOneBy({ id: body.branch });

    const { startOfDayUTC, endOfDayUTC } = this.getLocalTime(body.day, body.month, body.year, timezone);
    
    const slots = await this.WorkingRepository.createQueryBuilder("working")
      .leftJoinAndSelect("working.slot", "slot")
      .leftJoinAndSelect("slot.branch", "branch")
      .where("slot.branch.id = :branchId", { branchId: branch.id })
      .andWhere("working.from BETWEEN :startOfDayUTC AND :endOfDayUTC", { startOfDayUTC, endOfDayUTC })
      .orderBy("working.from", "ASC")
      .getMany();

    await this.WorkingRepository.remove(slots);

    const artists = await this.artistCount(branch.id);


    const workingEntities = await this.createWorkingHoursCalender(
      body.workingHours,
      body.day,
      body.month,
      body.year,
      artists,
      branch,
      timezone,
    );

    await this.WorkingRepository.save(workingEntities);
  }

  createTimeSlots(intervals: { from: Date; to: Date, id: number }[], duration: number) {
    const result = [];

    intervals.map(({ from, to, id }) => {
      let currentStartTime =
        new Date(from) > new Date()
          ? new Date(from)
          : new Date(Date.now() + 5 * 60 * 1000); // Start at the provided startTime

      const currentEndTime = new Date(to); // End at the provided endTime

      // Loop through the interval and create slots of the given duration
      while (currentStartTime < currentEndTime) {
        const nextSlotEnd = new Date(
          currentStartTime.getTime() + duration * 1000 * 60,
        );
        // console.log(nextSlotEnd , currentEndTime, currentStartTime, duration);

        // Ensure that we don't exceed the endTime

        console.log(nextSlotEnd.getTime());

        if (nextSlotEnd > currentEndTime) {
          break; // Stop if the next slot exceeds the endTime
        }

        const obj = {
          id,
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

  async getAllAvailableSlots(
    branchId: string,
    { day, month, year, duration }: AvailableQueryDto,
    timezone: string,
) {
    const { startOfDayUTC, endOfDayUTC } = this.getLocalTime(day, month, year, timezone);

    const slots = await this.WorkingRepository.createQueryBuilder("working")
      .leftJoinAndSelect("working.slot", "slot")
      .leftJoinAndSelect("slot.branch", "branch")
      .where("slot.branch.id = :branchId", { branchId })
      .andWhere("working.from BETWEEN :startOfDayUTC AND :endOfDayUTC", { startOfDayUTC, endOfDayUTC })
      .orderBy("working.from", "ASC")
      .getMany();

    console.log(slots);

    if (slots.length === 0) {
      return [];
    }

    return this.createTimeSlots(slots, duration);
}


  async getFirstSlotAvailable(
    branchId: string,
    serviceIds?: string[],
    rootoshIds?: string[],
  ) {
    // Check if both are provided
    if (serviceIds.length > 0 && rootoshIds.length > 0) {
      throw new HttpException(
        "Please provide either services or rootosh IDs, not both.",
        400,
      );
    }

    // Check if neither is provided
    if (serviceIds.length === 0 && rootoshIds.length === 0) {
      throw new HttpException(
        "At least one of services or rootosh IDs must be provided.",
        400,
      );
    }

    if (serviceIds.length > 0) {
      // Calculate duration based on services
      const { duration } =
        await this.reservationService.calculateTotalDuration(serviceIds);

      const workingHour = await this.WorkingRepository.createQueryBuilder(
        "working",
      )
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
          }),
        )
        .orderBy("slot.year", "ASC")
        .addOrderBy("slot.month", "ASC")
        .addOrderBy("slot.day", "ASC")
        .addOrderBy("working.from", "ASC")
        .getOne();

      if (!workingHour) {
        throw new HttpException(
          "No available slots found for the given services.",
          400,
        );
      }

      return this.createTimeSlots([workingHour], duration)[0] || null;
    }

    if (rootoshIds.length > 0) {
      // Calculate duration based on rootosh
      const { duration } =
        await this.reservationService.calculateRootoshTotalDuration(rootoshIds);

      const workingHour = await this.WorkingRepository.createQueryBuilder(
        "working",
      )
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
          }),
        )
        .orderBy("slot.year", "ASC")
        .addOrderBy("slot.month", "ASC")
        .addOrderBy("slot.day", "ASC")
        .addOrderBy("working.from", "ASC")
        .getOne();

      if (!workingHour) {
        throw new HttpException(
          "No available slots found for the given rootosh IDs.",
          400,
        );
      }
      return this.createTimeSlots([workingHour], duration)[0] ?? null;
    }

    throw new HttpException(
      "Either services or rootosh IDs must be provided.",
      400,
    );
  }
}
