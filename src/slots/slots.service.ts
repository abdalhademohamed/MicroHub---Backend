import { Injectable } from "@nestjs/common";
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
    private reservationService: ReservationService,
  ) {}
  artistCount(branchId: string) {
    return this.UserRepository.countBy({
      role: Role.ARTIST,
      // branch: {
      //   id: branchId,
      // },
    });
  }
  branchWorkingHours(branchId: string, dayOfWeek: WeekDays) {
    return this.WorkingBranchRepository.findOne({
      where: {
        branch: { id: branchId },
        dayOfWeek,
      }
    });
  }
  createWorkingHoursCalender(workingHours: string[], nextDate: Date, artistCount: number, slot: SlotsEntity){
    const workingEntities: WorkingEntity[] = [];
    for (let i = 0; i < workingHours.length; i += 2) {
      console.log(workingHours[i],workingHours[i+1]);
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
      const duration = Math.floor( ( to.getTime() - from.getTime() ) / ( 1000 * 60 ) );
      console.log(duration, artistCount);
      for( let j = 0; j < artistCount; j++ ){
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
    return new Date(year, month - 1, day, parseInt(hour, 10), parseInt(minute, 10));
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
    const dayOfWeek = this.getDayFromDate(body.year, body.month, body.day);
    const branch = await this.BranchRepository.findOneBy({ id: body.branch });
    // Find the working branch details for the given day and branch
    const workingBranch = await this.branchWorkingHours(branch.id, dayOfWeek);

    if (!workingBranch) {
      throw new Error(
        "Working hours for the selected branch and day not found.",
      );
    }

    // Check if a slot already exists for the given date
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
    if ( slot ){
      return {
        message: "Slot already exists",
        day: slot.day, month: slot.month, year: slot.year,
        calender: slot.workingEntity,
      };
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
    const workingEntities = this.createWorkingHoursCalender(workingBranch.workingHours, date, artistCount, slot);
    // Save all working entities in a single transaction
    const savedWorkingEntities=await this.WorkingRepository.save(workingEntities);

    return {
      message: "Slot created successfully",
      day: slot.day, month: slot.month, year: slot.year,
      calender: savedWorkingEntities,
    };
  }
  async getAllAvailableSlots(branchId: string, { page, limit }: { page?: number, limit?: number}){
    page = page || 1
    limit = limit || 10;
    const skip = ( page - 1 ) * limit;
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const day = new Date().getDate();
    // const slots = await this.SlotRepository.find({
    //   where: {
    //     day: MoreThanOrEqual(day),
    //     year: MoreThanOrEqual(year),
    //     month: MoreThanOrEqual(month),
    //     branch : { id : branchId },
    //   },
    //   relations: {
    //     workingEntity: true,
    //   },
    //   order: {
    //     year: "ASC",
    //     month: "ASC",
    //     day: "ASC",
    //   },
    //   skip,
    //   take: limit,
    // });
    const slots = await this.WorkingRepository.find({
      where : {
        slot: {
          branch: { id: branchId },
          day: MoreThanOrEqual(day),
          year: MoreThanOrEqual(year),
          month: MoreThanOrEqual(month),
        },
      },
      relations: { slot : { branch: true } },
      order: {
        from: 'ASC',
      },
      skip,
      take: limit,
    })
    return { slots, page };
  }
  async getFirstSlotAvailable(branchId: string, ids: string[]) {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const day = new Date().getDate();
    const { duration } = await this.reservationService.calculateTotalDuration(ids);
    const workingHour = await this.WorkingRepository.findOne({
      where: {
        slot: {
          branch: { id: branchId },
          day: MoreThanOrEqual(day),
          year: MoreThanOrEqual(year),
          month: MoreThanOrEqual(month),
        },
        duration: MoreThanOrEqual(duration),
      },
      relations : { slot : { branch : true } },
      order: {
        slot: {
          year: "ASC",
          month: "ASC",
          day: "ASC",
        },
        from: "ASC",
      },
    });
    return {  
      from: workingHour.from,
      to: workingHour.to,
      day: workingHour.slot.day,
      month: workingHour.slot.month,
      year: workingHour.slot.year,
      duration,
    };
  }
}
