import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CreateBranchDto } from "./dto/create.branch.dto";
import { UpdateBranchDto } from "./dto/update.branch.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BranchEntity } from "./entities/branch.entity";
import { PaginateResultDto } from "./dto/paginate.result.dto";
import { create } from "domain";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { I18nService } from "nestjs-i18n";
import { ReservationEntity } from "../reservation/entities/reservation.entity";
import { WorkingBranchEntity } from "../working-branch/entities/working.branch.entity";
import { WeekDays } from "./utils/days.enum";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { UserEntity } from "../user/entities/user.entity";
import { UserService } from "../user/user.service";
import { FilterBranchesDto } from "./dto/filter.branch.dto";
import { FilterBranchCalendarDto } from "./dto/filter.branch.calendar.dto";

@Injectable()
export class BranchService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly BranchRepository: Repository<BranchEntity>,
    private readonly CloudinaryService: CloudinaryService,
    @InjectRepository(ReservationEntity)
    private readonly ReservationRepository: Repository<ReservationEntity>,
    @InjectRepository(WorkingBranchEntity)
    private readonly WorkingBranchRepository: Repository<WorkingBranchEntity>,

    @InjectRepository(AuditLogEntity)
    private readonly AuditLogRepository: Repository<AuditLogEntity>,

    private readonly UserService: UserService
  ) {}

  async createBranch(
    createBranchDto: CreateBranchDto,
    userId: string
  ): Promise<BranchEntity> {
    const { name, location, image, workingBranch } = createBranchDto;
  
    try {
      // Check if the branch already exists
      const existingBranch = await this.BranchRepository.findOne({
        where: [{ name }, { location }],
      });
  
      if (existingBranch) {
        throw new ConflictException(
          "A branch with the given name or location already exists."
        );
      }
  
      // Create and save the new branch
      const branch = this.BranchRepository.create({
        name,
        location,
        image,
        createdBy: userId,
        workingbranch:[]
      });
      const savedBranch = await this.BranchRepository.save(branch);
  
      // // If workingBranches are provided, create WorkingBranchEntity records
      // if (workingBranch && workingBranch.length > 0) {
      //   const workingBranchEntities = workingBranches.map(wbDto => {
      //     const weekDayEnum = WeekDays[wbDto.dayOfWeek as keyof typeof WeekDays];
      //     if (!weekDayEnum) {
      //       throw new Error(`Invalid dayOfWeek: ${wbDto.dayOfWeek}`);
      //     }
      //     return this.WorkingBranchRepository.create({
      //       dayOfWeek: weekDayEnum,
      //       workingHours: wbDto.workingHours,
      //       branch: savedBranch,
      //     });
      //   });
  
      //   // Save all working branch entities
      //   await this.WorkingBranchRepository.save(workingBranchEntities);
      // }
  
      // Create an audit log entry
      const log = new AuditLogEntity();
      log.tableName = "branch"; // Use the table name
      log.action = "INSERT";
      log.entityId = savedBranch.id;
      log.performedBy = userId;
  
      // Fetch user details if needed
      if (userId) {
        const user = await this.UserService.getUserDetails(userId);
        log.userDetails = user;
      }
  
      await this.AuditLogRepository.save(log);
  
      return savedBranch;
    } catch (error) {
      // Handle specific errors
      if (error instanceof ConflictException) {
        throw error;
      }
  
      // Handle unexpected errors
      throw new InternalServerErrorException(
        "An unexpected error occurred while creating the branch."
      );
    }
  }
  // async createWorkingHours(createBranchWorkingHoursDto: CreateBranchWorkingHoursDto): Promise<void> {
  //   const { branchId, dayOfWeek, workingHours } = createBranchWorkingHoursDto;

  //   // Find the branch by ID
  //   const branch = await this.BranchRepository.findOne({ where: { id: branchId }});
  //   if (!branch) {
  //     throw new NotFoundException(`Branch with ID ${branchId} not found`);
  //   }

  //   // Check if there's already a schedule for the given day
  //   // let schedule = branch.schedules.find(s => s.dayOfWeek === dayOfWeek);

  //   // if (schedule) {
  //   //   // Update existing schedule
  //   //   schedule.workingHours = workingHours;
  //   // } else {
  //     // Create a new schedule
  //    const schedule = this.BranchRepository.create({
  //       dayOfWeek,
  //       workingHours,
  //       branch,
  //     });
  //     branch.schedules.push(schedule);
  //   // }

  //   await this.branchScheduleRepository.save(schedule);
  //   console.log(`Created/Updated working hours for Branch ID: ${branchId} on ${dayOfWeek}`);
  // }

  async getBranchWithWorkingHours(branchId: string): Promise<{
    branch: BranchEntity;
    workingHours: { dayOfWeek: string; hours: string[] }[];
  }> {
    // Fetch the branch entity to ensure it exists
    const branch = await this.BranchRepository.findOne({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Fetch working hours for the specified branch
    const workingHoursEntities = await this.WorkingBranchRepository.find({
      where: { branch: { id: branchId } },
    });

    const workingHours = workingHoursEntities.map(entity => ({
      dayOfWeek: entity.dayOfWeek,
      hours: entity.workingHours,
    }));

    return {
      branch,
      workingHours,
    };
  }


  async getBranchCalendar(
    filterDto: FilterBranchCalendarDto
  ): Promise<{
    branch: {
      id: string;
      name: string;
      location: string;
      image: string;
    };
    workingHours: { dayOfWeek: string; hours: string[] }[];
    reservations: any[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    const { branchId, dayOfWeek, date, page = 1, limit = 10, order = 'ASC' } = filterDto;
  
    // Fetch the branch entity to ensure it exists
    const branch = await this.BranchRepository.findOne({
      where: { id: branchId },
    });
  
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  
    // Prepare working hours response
    let workingHours: { dayOfWeek: string; hours: string[] }[] = [];
  
    if (dayOfWeek) {
      // Convert dayOfWeek string to WeekDays enum
      const weekDayEnum = WeekDays[dayOfWeek as keyof typeof WeekDays];
  
      if (!weekDayEnum) {
        throw new BadRequestException('Invalid day of the week');
      }
  
      // Find the working branch entity for the given day
      const workingBranch = await this.WorkingBranchRepository.findOne({
        where: {
          branch: { id: branchId },
          dayOfWeek: weekDayEnum,
        },
      });
  
      if (workingBranch) {
        workingHours.push({
          dayOfWeek: weekDayEnum,
          hours: workingBranch.workingHours,
        });
      }
    } else {
      // Fetch working hours for all days if dayOfWeek is not provided
      workingHours = await this.WorkingBranchRepository.find({
        where: { branch: { id: branchId } },
      }).then(results => results.map(wb => ({
        dayOfWeek: wb.dayOfWeek,
        hours: wb.workingHours,
      })));
    }
  
    // Handle date for reservations
    const reservationsDate = date ? new Date(date) : new Date();
    const reservationDay = reservationsDate.getDate();
    const reservationMonth = reservationsDate.getMonth() + 1; // Months are 0-indexed
    const reservationYear = reservationsDate.getFullYear();
  
    // Calculate pagination
    const [reservations, total] = await this.ReservationRepository.findAndCount({
      where: {
        branch: { id: branchId },
        reservationDay,
        reservationMonth,
        reservationYear,
      },
      order: {
        start_Time: order, // Order reservations by start time
      },
      skip: (page - 1) * limit,
      take: limit,
    });
  
    // Return branch details, working hours, and reservations
    return {
      branch: {
        id: branch.id,
        name: branch.name,
        location: branch.location,
        image: branch.image,
      },
      workingHours,
      reservations,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }
  async uploadImage(
    file: Express.Multer.File,
    folderName: string
  ): Promise<string> {
    const result = await this.CloudinaryService.uploadImage(file, folderName);
    return result.url; // Return the URL of the uploaded image
  }

  async updateBranch(
    branchId: string,
    updateBranchDto: UpdateBranchDto,
    userId: string
  ): Promise<BranchEntity> {
    try {
      // Find the branch by ID
      const branch = await this.BranchRepository.findOne({
        where: { id: branchId },
      });
  
      if (!branch) {
        throw new NotFoundException(`Branch with ID ${branchId} not found.`);
      }
  
      // Track original values
      const originalBranch = { ...branch };
  
      // Update branch properties
      const { name, location, image } = updateBranchDto;
      branch.name = name ?? branch.name;
      branch.location = location ?? branch.location;
      branch.image = image ?? branch.image;
      branch.updatedBy = userId;
  
      // Save the updated branch
      const updatedBranch = await this.BranchRepository.save(branch);
  
      // Determine which columns have changed and log detailed information
      const changedColumns = [];
      const changesDetails = {};
      
      if (originalBranch.name !== updatedBranch.name) {
        changedColumns.push("name");
        changesDetails["name"] = {
          oldValue: originalBranch.name,
          newValue: updatedBranch.name,
        };
      }
      if (originalBranch.location !== updatedBranch.location) {
        changedColumns.push("location");
        changesDetails["location"] = {
          oldValue: originalBranch.location,
          newValue: updatedBranch.location,
        };
      }
      if (originalBranch.image !== updatedBranch.image) {
        changedColumns.push("image");
        changesDetails["image"] = {
          oldValue: originalBranch.image,
          newValue: updatedBranch.image,
        };
      }
  
      // Debug statements
      console.log("Original Branch:", originalBranch);
      console.log("Updated Branch:", updatedBranch);
      console.log("Changed Columns:", changedColumns);
      console.log("Changes Details:", changesDetails);
  
      // Create an audit log entry
      const auditLog = new AuditLogEntity();
      auditLog.tableName = "branch";
      auditLog.action = "UPDATE";
      auditLog.entityId = branchId;
      auditLog.performedBy = userId;
      auditLog.changedColumns = changedColumns; // Log changed columns
      auditLog.changesDetails = changesDetails; // Log detailed changes
  
      // Optionally, get user details for more detailed logging
      if (userId) {
        const user = await this.UserService.getUserDetails(userId);
        auditLog.userDetails = user; // Adjust according to your AuditLogEntity structure
      }
  
      await this.AuditLogRepository.save(auditLog);
  
      return updatedBranch;
    } catch (error) {
      console.error('Update Branch Error:', error); // Debug statement
      throw new InternalServerErrorException(
        "An unexpected error occurred while updating the branch."
      );
    }
  }
  
  
  async deleteBranch(branchId: string, userId: string): Promise<void> {
    try {
      // Find the branch by ID
      const branch = await this.BranchRepository.findOne({
        where: { id: branchId },
      });

      if (!branch) {
        throw new NotFoundException(`Branch with ID ${branchId} not found.`);
      }
      // Update the branch entity to record who deleted it
      branch.deletedBy = userId;
      await this.BranchRepository.save(branch);
      // Log the deletion
      const auditLog = new AuditLogEntity();
      auditLog.tableName = "branch";
      auditLog.action = "DELETE";
      auditLog.entityId = branchId;
      auditLog.performedBy = userId;

      // Optionally, get user details for more detailed logging
      if (userId) {
        const user = await this.UserService.getUserDetails(userId); // Adjust method according to your UserService
        auditLog.userDetails = user; // Adjust according to your AuditLogEntity structure
      }

      // Save the audit log before performing the deletion
      await this.AuditLogRepository.save(auditLog);
      // Delete the branch
      await this.BranchRepository.delete(branchId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        "An unexpected error occurred while deleting the branch."
      );
    }
  }
}
