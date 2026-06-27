import { HttpException, Injectable } from "@nestjs/common";
import { WeekDays } from "../branch/utils/days.enum";
import { CreateSlotDto } from "./dto/create.slot.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkingBranchEntity } from "../working-branch/entities/working.branch.entity";
import { Brackets, In, Repository } from "typeorm";
import { BranchEntity } from "../branch/entities/branch.entity";
import { Role } from "../user/utils/user.enum";
import { ReservationService } from "../reservation/reservation.service";
import { SlotsEntity } from "./entities/slots.entity";
import { WorkingEntity } from "./entities/working.entity";
import { AvailableQueryDto } from "./dto/query.available.dto";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { DateTime } from 'luxon';
import { Cron } from "@nestjs/schedule";
import { ReservationEntity } from "src/reservation/entities/reservation.entity";
import { OrderStatus } from "src/orders/utils/order.status.enum";
import { ModuleRef } from "@nestjs/core";

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
    private moduleRef: ModuleRef,
    @InjectRepository(ReservationEntity)
    private readonly ReservationRepository: Repository<ReservationEntity>,
  ) {}

  async getAllBranch() {
    const branchs = await this.BranchRepository.find({
      where: { isActive: true },
    });
    return branchs;
  }
  @Cron('0 0 * * *')
  async handleCronJop() {
    const branchs = await this.getAllBranch();
    for(const branch of branchs ) {
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
      for(let i=0; i < daysOfWeek.length; i++) {
        const {timezone, workingHours} = await this.branchWorkingHours(branch.id, daysOfWeek[i])
        
        if (!workingHours || workingHours.length === 0) continue;

        const targetDayOfWeek = daysOfWeek.indexOf(daysOfWeek[i]);
        let daysToAdd = targetDayOfWeek - todayDayOfWeek;
        if (daysToAdd < 0) {
          daysToAdd += 7;
        }
        const resultDates: { day: number; month: number; year: number }[] = [];
        
        for (let j = 0; j < 24; j++) {
          const nextDate = new Date();
          nextDate.setUTCHours(0,0,0,0);
          nextDate.setDate(today.getDate() + daysToAdd + j * 7);

          resultDates.push({
            day: nextDate.getUTCDate(),
            year: nextDate.getUTCFullYear(),
            month: nextDate.getUTCMonth() + 1,
          });
        }
        for (const { day, year, month } of resultDates) {
          const { startOfDayUTC, endOfDayUTC } = this.getLocalTime(day, month, year, timezone);
    
          const slots = await this.WorkingRepository.createQueryBuilder("working")
            .leftJoinAndSelect("working.slot", "slot")
            .leftJoinAndSelect("slot.branch", "branch")
            .where("slot.branch.id = :branchId", { branchId: branch.id })
            .andWhere("working.from BETWEEN :startOfDayUTC AND :endOfDayUTC", { startOfDayUTC, endOfDayUTC })
            .orderBy("working.from", "ASC")
            .getMany();
          if(slots && slots.length > 0) {
            continue;
          }

          const dailyArtists = await this.artistCount(branch.id);

          const workingEntity =
            await this.createWorkingHoursCalender(workingHours, day, month, year, dailyArtists, branch, timezone);

          await this.WorkingRepository.save(workingEntity);
      }
    }  
    }
  }

  splitOvernightIntervals(utcDateTimes: string[]): string[] {

    const result: string[] = [];

    console.log(utcDateTimes);
    for (let i = 0; i < utcDateTimes.length; i += 2) {
      const toDate = new Date(utcDateTimes[i + 1]);

      result.push(utcDateTimes[i]); 

      if (toDate.getUTCMinutes() === 59) {
        toDate.setUTCMinutes(toDate.getUTCMinutes() + 1);
        result.push(toDate.toISOString());
        continue;
      }

      result.push(utcDateTimes[i + 1]); 
    }

    return result;

  }

  processTimes(times: string[]): string[] {
    const sortedTimes = [...times].sort();
  
    const result: string[] = [];
    let skipNext = false;
  
    for (let i = 0; i < sortedTimes.length; i++) {
      if (skipNext) {
        skipNext = false;
        continue;
      }
  
      if (sortedTimes[i] === sortedTimes[i + 1]) {
        skipNext = true; 
        continue;
      }
  
      result.push(sortedTimes[i]);
    }
  
    return result;
  }

  convertToUtc(day: number, month: number, year: number, times: string[], timeZone: string): string[] {
    console.log('date is =>', day, month, year);
    console.log('times is =>', times)
    console.log('time zone is', timeZone);

    const workingTimes = this.processTimes(times);

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
    
    for (let i = 0; i < 24; i++) {
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
        isActive: true,
        branch: {
          id: branchId,
        },
      },
    });
    return artists;
  }

  async branchWorkingHours(branchId: string, dayOfWeek: WeekDays) {
    const branchWorking = await this.WorkingBranchRepository.findOne({
      where: {
        branch: { id: branchId },
        dayOfWeek,
      },
    });
    console.log(branchWorking);
    return { workingHours: branchWorking?.clientWorkingHours || [], timezone: branchWorking?.timezone || 'Asia/Riyadh' };
  }

  getLocalHour(utcTime: string, timeZone: string): string {
    const localTime = DateTime.fromISO(utcTime, { zone: 'utc' }).setZone(timeZone);
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
  
      slot = await this.SlotRepository.save(slot);
    }
    return slot;
  }


  getLocalTime(day: number, month: number, year: number, timezone: string) {
    console.log('day month year logs', day , month, year);
    const startOfDayLocal = DateTime.fromObject(
        { year, month, day, hour: 0, minute: 0, second: 0 },
        { zone: timezone }
    );

    const endOfDayLocal = startOfDayLocal.set({ hour: 23, minute: 59, second: 59 });

    const startOfDayUTC = startOfDayLocal.toUTC().toISO(); 
    const endOfDayUTC = endOfDayLocal.toUTC().toISO(); 

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
      console.log('artist base time is', artists.length > 0 ? artists[0].workingHours : 0);

      let baseTo = new Date(workingHours[i + 1]);
      let baseDuration = Math.ceil((baseTo.getTime() - from.getTime()) / (1000 * 60));

      if(baseDuration <= 0){
        continue;
      }

      const slot = await this.getSlotForDay(from, branch);

      for (let j = 0; j < artists.length; j++) {
        let artistTo = new Date(baseTo);
        let artistDuration = baseDuration;

        const noOfHours = Math.floor(artistDuration / 60);
        if (artists[j].workingHours <= 0) {
          continue;
        }
        let time = artists[j].workingHours - noOfHours;

        if (time < 0) {
          artistTo = new Date(from.getTime() + artists[j].workingHours * 3600 * 1000);
          artistDuration = Math.floor((artistTo.getTime() - from.getTime()) / (1000 * 60));
          time = 0;
        }

        artists[j].workingHours = time;

        const workingEntity = this.WorkingRepository.create({
          from,
          to: artistTo,
          slot: slot,
          duration: artistDuration,
        });

        workingEntities.push(workingEntity);
      }
    }

    console.log(workingEntities);

    return workingEntities;
  }
  async addReservation(branch: string, startTime: Date, endTime: Date) {
    const workingDate = startTime;
    
    const reservationService = await this.moduleRef.resolve(ReservationService, undefined, { strict: false });
    const workingHours = await reservationService.getWorkingHoursAtSpecificDate(
      branch,
      workingDate,
    );
    
    console.log(workingHours);
    
    const index = workingHours.findIndex(
      (w) => w.from <= startTime && w.to >= endTime,
    );
    
          console.log(index);
    
     if (index === -1) {
      return null;
    }

    const newWorkingHours = reservationService.newAddedWorkingHours(
      {
        fromOriginal: workingHours[index].from,
        toOriginal: workingHours[index].to,
        fromUser: startTime,
        toUser: endTime,
      },
        workingHours[index].slot,
      );
    
    await this.WorkingRepository.save(newWorkingHours);
    await this.WorkingRepository.delete({ id: workingHours[index].id });
  }
  
  // @OnEvent("artist:created")
  // async createSlotsForArtist(artist: EmployeeEntity) {
  //   console.log('artist is', artist);
  //   const today = new Date();
  //   console.log(today.getUTCDate(), today.getUTCMonth() + 1, today.getUTCFullYear());
  //   today.setHours(0, 0, 0, 0);
  //   console.log(today.getUTCDate(), today.getUTCMonth() + 1, today.getUTCFullYear());
  //   let loopOn = true;
  //   // console.log(artist)
  //   while (loopOn) {
  //     console.log(today.getUTCDate(), today.getUTCMonth() + 1, today.getUTCFullYear());
  //     const slot = await this.SlotRepository.findOne({
  //       where: {
  //         day: today.getUTCDate(),
  //         month: today.getUTCMonth() + 1,
  //         year: today.getFullYear(),
  //         branch: {
  //           id: artist.branch.id,
  //         },
  //       },
  //       relations: {
  //         branch: true,
  //       },
  //     });
  //     // console.log(slot);
  //     console.log('slot is', slot);
  //     if (!slot) {
  //       const count = await this.SlotRepository.count({
  //         where: {
  //           day: MoreThan(today.getUTCDate()),
  //           month: MoreThanOrEqual(today.getUTCMonth() + 1),
  //           year: MoreThanOrEqual(today.getUTCFullYear()),
  //           branch: {
  //             id: artist.branch.id,
  //           },
  //         },
  //       });
  //       console.log('count is', count);
  //       if (count === 0) {
  //         loopOn = false;
  //         continue;
  //       }
  //       today.setUTCDate(today.getUTCDate() + 1);
  //       continue;
  //     }
  //     const day = this.getDayFromDate(
  //       today.getUTCFullYear(),
  //       today.getUTCMonth() + 1,
  //       today.getUTCDate(),
  //     );
  //     let { workingHours, timezone }= await this.branchWorkingHours(artist.branch.id, day);
  
  //     workingHours = this.convertToUtc(today.getUTCDate(), today.getUTCMonth() + 1, today.getUTCFullYear(), workingHours, timezone);

  //     // console.log()
  //     const workingEntities: WorkingEntity[] = [];
  //     let artistWorkingHours = artist.workingHours * 1;

  //     for (let i = 0; i < workingHours.length; i += 2) {
  
  //       if (artistWorkingHours <= 0) {
  //         break;
  //       }

  //       let from = new Date(workingHours[i]);
  
  //       let to = new Date(workingHours[i + 1]);
  
  //       let duration = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60));
  
  //       if(duration <= 0){
  //         continue;
  //       }
  
  //       const slot = await this.getSlotForDay(from, artist.branch);
  
  //       const noOfHours = Math.floor(duration / 60);

  //       let time = artistWorkingHours - noOfHours;

  //       console.log('artsit working hours', artistWorkingHours);
  
  //       if (time < 0) {
  //         to = new Date(from.getTime() + artistWorkingHours * 3600 * 1000);
  //         duration = Math.floor((to.getTime() - from.getTime()) / (1000 * 60));
  //         time = 0;
  //       }
  
  //       artistWorkingHours = time;
  
  //       const workingEntity = this.WorkingRepository.create({
  //         from,
  //         to,
  //         slot: slot,
  //         duration,
  //       });
  
  //       workingEntities.push(workingEntity);

  //       console.log('working entity is', workingEntities);
  //     }
  //     const saved = await this.WorkingRepository.save(workingEntities);
  //     console.log(saved);
  //     today.setUTCDate(today.getUTCDate() + 1);
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

    const reservations = await this.ReservationRepository.find({
      where: {
        branch: { id: body.branch },
        reservationDay: body.day,
        reservationMonth: body.month,
        reservationYear: body.year,
        order: {
          status: In([OrderStatus.Completed, OrderStatus.Working, OrderStatus.InQueue, OrderStatus.Pending, OrderStatus.Reviewed]),
        }
      },
      order: {
        createdAt: "ASC", 
      },
      relations: {
        order: true,
      }
    });
    for (const reservation of reservations) {
      await this.addReservation(body.branch, reservation.start_Time, reservation.end_Time);
    }
  }

  createTimeSlots(intervals: { from: Date; to: Date, id: number }[], duration: number) {
    const result = [];

    intervals.map(({ from, to, id }) => {
      let currentStartTime =
        new Date(from) > new Date()
          ? new Date(from)
          : new Date(Date.now() + 5 * 60 * 1000); 

      const currentEndTime = new Date(to); 

      while (currentStartTime < currentEndTime) {
        const nextSlotEnd = new Date(
          currentStartTime.getTime() + duration * 1000 * 60,
        );

        console.log(nextSlotEnd.getTime());

        if (nextSlotEnd > currentEndTime) {
          break; 
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
    if (serviceIds.length > 0 && rootoshIds.length > 0) {
      throw new HttpException(
        "Please provide either services or rootosh IDs, not both.",
        400,
      );
    }

    if (serviceIds.length === 0 && rootoshIds.length === 0) {
      throw new HttpException(
        "At least one of services or rootosh IDs must be provided.",
        400,
      );
    }

    if (serviceIds.length > 0) {
      const reservationService = await this.moduleRef.resolve(ReservationService, undefined, { strict: false });
      const { duration } =
        await reservationService.calculateTotalDuration(serviceIds);

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
      const reservationService = await this.moduleRef.resolve(ReservationService, undefined, { strict: false });
      const { duration } =
        await reservationService.calculateRootoshTotalDuration(rootoshIds);

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