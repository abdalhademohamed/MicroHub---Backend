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
import { IsNull, Not, Repository } from "typeorm";
import { BranchEntity } from "./entities/branch.entity";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { ReservationEntity } from "../reservation/entities/reservation.entity";
import { WorkingBranchEntity } from "../working-branch/entities/working.branch.entity";
import { WeekDays } from "./utils/days.enum";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { UserService } from "../user/user.service";
import { FilterBranchesDto } from "./dto/filter.branch.dto";
import { FilterBranchCalendarDto } from "./dto/filter.branch.calendar.dto";
import { BranchDto } from "./dto/branch.employee.dto";
import { Role } from "../user/utils/user.enum";
import { Postion } from "../postion/utils/postion.enum";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { CustomI18nService } from "../common/custom.18n.service";
import { Cron, CronExpression } from "@nestjs/schedule";

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

    @InjectRepository(EmployeeEntity)
    private readonly EmployeeRepository: Repository<EmployeeEntity>,
    private readonly UserService: UserService,
    private readonly i18n: CustomI18nService,
  ) {}

  async createBranch(
    createBranchDto: CreateBranchDto,
    userId: string,
  ): Promise<BranchEntity> {
    const { name, location, image, workingBranch } = createBranchDto;

    try {
      // Check if the branch already exists
      const existingBranch = await this.BranchRepository.findOne({
        where: [{ name }, { location }],
      });

      if (existingBranch) {
        throw new ConflictException(
          this.i18n.translate("test.BRANCH.NAME_LOCATION_EXISTS"),
        );
      }
      // Validate URL
      if (!this.isValidUrl(location)) {
        throw new BadRequestException(
          this.i18n.translate("test.BRANCH.INVALID_URL"),
        );
      }
      // Create and save the new branch
      const branch = this.BranchRepository.create({
        name,
        location,
        image,
        createdBy: userId,
        workingbranch: [],
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
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Handle unexpected errors
      throw new InternalServerErrorException(
        this.i18n.translate("test.BRANCH.CREATE_FAILED"),
      );
    }
  }
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }
  // async getAllBranches(
  //   filterDto: FilterBranchesDto
  // ): Promise<{
  //   items: BranchDto[];
  //   total: number;
  //   currentPage: number;
  //   totalPages: number;
  // }> {
  //   const { page = 1, limit = 10, order = 'ASC' } = filterDto;

  //   // Validate pagination values
  //   if (page < 1 || limit < 1) {
  //     throw new BadRequestException('Page and limit must be greater than 0');
  //   }

  //   // Validate order value
  //   if (!['ASC', 'DESC'].includes(order)) {
  //     throw new BadRequestException('Invalid order value. Must be "ASC" or "DESC"');
  //   }

  //   try {
  //     // Build the query
  //     const query = this.BranchRepository.createQueryBuilder('branch')
  //       .leftJoinAndSelect('branch.employees', 'employee')
  //       .select([
  //         'branch.id',
  //         'branch.name',
  //         'branch.location',
  //         'branch.image',
  //         'branch.createdBy',
  //         'branch.updatedBy',
  //         'branch.deletedBy',
  //         'employee.id',
  //         'employee.username',
  //         'employee.email',
  //         'employee.role',
  //         'employee.english_Name',
  //         'employee.arabic_Name',
  //         'employee.workingHours',
  //         'employee.phoneNumber',
  //         'employee.image',
  //         'employee.totalReviews', // Ensure this field exists in EmployeeEntity
  //       ])
  //       .skip((page - 1) * limit)
  //       .take(limit)
  //       .orderBy('branch.name', order.toUpperCase() as 'ASC' | 'DESC');

  //     // Execute the query
  //     const [branches, total] = await query.getManyAndCount();

  //     // Calculate total pages
  //     const totalPages = Math.ceil(total / limit);

  //     // Map the results to DTO
  //     const items = branches.map(branch => {
  //       return {
  //         ...branch,
  //         employees: branch.employees.map(employee => ({
  //           id: employee.id,
  //           username: employee.username,
  //           email: employee.email,
  //           role: employee.role,
  //           englishName: employee.english_Name,
  //           arabicName: employee.arabic_Name,
  //           workingHours: employee.workingHours,
  //           phoneNumber: employee.phoneNumber,
  //           image: employee.image,
  //           totalReview: Number(employee.totalReviews), // Ensure it's a number
  //         })),
  //       };
  //     });

  //     return {
  //       items,
  //       total,
  //       currentPage: page,
  //       totalPages,
  //     };
  //   } catch (error) {
  //     throw new InternalServerErrorException('Failed to get branches', (error as any).stack);
  //   }
  // }

  async getAllBranches(
    filterDto: FilterBranchesDto,
    userRole: Role,
    userId: string,
  ): Promise<{
    items: BranchDto[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, order = "ASC" } = filterDto;

    // Validate pagination values
    if (page < 1 || limit < 1) {
      throw new BadRequestException(
        this.i18n.translate("test.BRANCH.INVALID_PAGINATION"),
      );
    }

    // Validate order value
    if (!["ASC", "DESC"].includes(order)) {
      throw new BadRequestException(
        this.i18n.translate("test.BRANCH.INVALID_ORDER"),
      );
    }

    try {
      // Build the query
      let query = this.BranchRepository.createQueryBuilder("branch")
        .leftJoinAndSelect("branch.employees", "employeeAlias") // Use an alias
        .select([
          "branch.id",
          "branch.name",
          "branch.location",
          "branch.image",
          "branch.createdBy",
          "branch.updatedBy",
          "branch.deletedBy",
          "branch.isActive",
          "employeeAlias.id", // Use the alias here
          "employeeAlias.username",
          "employeeAlias.email",
          "employeeAlias.role",
          "employeeAlias.english_Name",
          "employeeAlias.arabic_Name",
          "employeeAlias.workingHours",
          "employeeAlias.phoneNumber",
          "employeeAlias.image",
          "employeeAlias.totalReviews", // Ensure this field exists in EmployeeEntity
        ])
        .skip((page - 1) * limit)
        .take(limit)
        .orderBy("branch.name", order.toUpperCase() as "ASC" | "DESC");

      // If the user is not an admin,restrict to the branch they're associated with
      if (
        ![
          Role.ADMIN,
          Role.SUPERADMIN,
          Role.COORDINATOR,
          Role.ARTISTMANAGER,
          Role.ACCOUNTANT,
        ].includes(userRole)
      ) {
        query = query
          .leftJoin("branch.employees", "userEmployee") // Alias for user's employee
          .where("userEmployee.id = :userId", { userId });
      }

      // Execute the query
      const [branches, total] = await query.getManyAndCount();

      // Calculate total pages
      const totalPages = Math.ceil(total / limit);

      // Map the results to DTO
      const items = branches.map((branch) => {
        return {
          ...branch,
          employees: branch.employees.map((employee) => ({
            id: employee.id,
            username: employee.username,
            email: employee.email,
            role: employee.role,
            englishName: employee.english_Name,
            arabicName: employee.arabic_Name,
            workingHours: employee.workingHours,
            phoneNumber: employee.phoneNumber,
            image: employee.image,
            totalReview: Number(employee.totalReviews), // Ensure it's a number
          })),
        };
      });

      return {
        items,
        total,
        currentPage: page,
        totalPages,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        "Failed to get branches",
        (error as any).stack,
      );
    }
  }

  async getBranchWithWorkingHours(branchId: string): Promise<{
    branch: BranchEntity;
    workingHours: { dayOfWeek: string; hours: string[] }[];
  }> {
    // Fetch the branch entity to ensure it exists
    const branch = await this.BranchRepository.findOne({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException(this.i18n.translate("test.BRANCH.NOT_FOUND"));
    }

    // Fetch working hours for the specified branch
    const workingHoursEntities = await this.WorkingBranchRepository.find({
      where: { branch: { id: branchId } },
    });

    const workingHours = workingHoursEntities.map((entity) => ({
      dayOfWeek: entity.dayOfWeek,
      hours: entity.workingHours,
    }));

    return {
      branch,
      workingHours,
    };
  }

  async getBranchCalendar(filterDto: FilterBranchCalendarDto): Promise<{
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
    const {
      branchId,
      dayOfWeek,
      date,
      page = 1,
      limit = 10,
      order = "ASC",
    } = filterDto;

    // Fetch the branch entity to ensure it exists
    const branch = await this.BranchRepository.findOne({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException(this.i18n.translate("test.BRANCH.NOT_FOUND"));
    }

    // Prepare working hours response
    let workingHours: { dayOfWeek: string; hours: string[] }[] = [];

    if (dayOfWeek) {
      // Convert dayOfWeek string to WeekDays enum
      const weekDayEnum = WeekDays[dayOfWeek as keyof typeof WeekDays];

      if (!weekDayEnum) {
        throw new BadRequestException("Invalid day of the week");
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
      }).then((results) =>
        results.map((wb) => ({
          dayOfWeek: wb.dayOfWeek,
          hours: wb.workingHours,
        })),
      );
    }

    // Handle date for reservations
    const reservationsDate = date ? new Date(date) : new Date();
    const reservationDay = reservationsDate.getDate();
    const reservationMonth = reservationsDate.getMonth() + 1; // Months are 0-indexed
    const reservationYear = reservationsDate.getFullYear();

    // Calculate pagination
    const [reservations, total] = await this.ReservationRepository.findAndCount(
      {
        where: {
          branch: { id: branchId },
          reservationDay,
          reservationMonth,
          reservationYear,
        },
        order: {
          start_Time: order as any, // Order reservations by start time
        },
        skip: (page - 1) * limit,
        take: limit,
      },
    );

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
    folderName: string,
  ): Promise<string> {
    const result = await this.CloudinaryService.uploadImage(file, folderName);
    return result.url; // Return the URL of the uploaded image
  }

  async updateBranch(
    branchId: string,
    updateBranchDto: UpdateBranchDto,
    userId: string,
    image: Express.Multer.File,
  ): Promise<BranchEntity> {
    try {
      // Find the branch by ID
      const branch = await this.BranchRepository.findOne({
        where: { id: branchId },
      });

      if (!branch) {
        throw new NotFoundException(
          this.i18n.translate("test.BRANCH.NOT_FOUND"),
        );
      }

      // Track original values
      const originalBranch = { ...branch };

      // Update branch properties
      const { name, location } = updateBranchDto;
      branch.name = name ?? branch.name;
      branch.location = location ?? branch.location;

      if ('isActive' in updateBranchDto) {
        branch.isActive = (updateBranchDto as any).isActive;
      }

      // Handle image upload and update
      const folderName = "branch";
      if (image) {
        // Upload the new image
        const uploadedImage = await this.CloudinaryService.uploadImage(
          image,
          folderName,
        ); // Adjust according to your Cloudinary service method
        branch.image = uploadedImage.url; // Assume the Cloudinary service returns a URL
      }

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
      if (originalBranch.isActive !== updatedBranch.isActive) {
        changedColumns.push("isActive");
        changesDetails["isActive"] = {
          oldValue: originalBranch.isActive,
          newValue: updatedBranch.isActive,
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
      console.error("Update Branch Error:", error); // Debug statement
      throw new InternalServerErrorException(
        this.i18n.translate("test.BRANCH.UPDATE_FAILED"),
      );
    }
  }

  async setBranchActive(branchId: string, isActive: boolean, userId: string): Promise<BranchEntity> {
    const branch = await this.BranchRepository.findOne({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException(this.i18n.translate("test.BRANCH.NOT_FOUND"));
    }
    branch.isActive = isActive;
    branch.updatedBy = userId;
    return this.BranchRepository.save(branch);
  }

  async toggleBranchStatus(branchId: string, userId: string): Promise<BranchEntity> {
    const branch = await this.BranchRepository.findOne({
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException(this.i18n.translate("test.BRANCH.NOT_FOUND"));
    }
    
    branch.isActive = !branch.isActive;
    branch.updatedBy = userId;
    
    const updatedBranch = await this.BranchRepository.save(branch);
    
    const auditLog = new AuditLogEntity();
    auditLog.tableName = "branch";
    auditLog.action = "UPDATE";
    auditLog.entityId = branchId;
    auditLog.performedBy = userId;
    auditLog.changedColumns = ["isActive"];
    auditLog.changesDetails = {
      isActive: { oldValue: !branch.isActive, newValue: branch.isActive }
    };
    
    await this.AuditLogRepository.save(auditLog);
    
    return updatedBranch;
  }

  async deleteBranch(branchId: string, userId: string): Promise<void> {
    try {
      // Find the branch by ID
      const branch = await this.BranchRepository.findOne({
        where: { id: branchId },
      });

      if (!branch) {
        throw new NotFoundException(
          this.i18n.translate("test.BRANCH.NOT_FOUND"),
        );
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
      // Delete the branch safely
      await this.BranchRepository.softDelete(branchId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        this.i18n.translate("test.BRANCH.DELETE_FAILED"),
      );
    }
  }

  async countBranches(): Promise<number> {
    return await this.BranchRepository.count();
  }

  // Function to check if the branch has an employee with position 'ARTIST'
  async hasArtist(branchId: string): Promise<boolean> {
    // Find employees with the 'ARTIST' position in the specified branch
    const artistCount = await this.EmployeeRepository.count({
      where: {
        branch: { id: branchId },
        position: { postion: Postion.ARTIST }, // Filtering by position ARTIST
      },
      relations: ["branch", "position"], // Ensures the relation is loaded
    });
    console.log(artistCount);

    // Return true if there is at least one artist, otherwise false
    return artistCount > 0;
  }

  async restoreBranch(branchId: string): Promise<BranchEntity> {
    const branch = await this.BranchRepository.findOne({
      where: { id: branchId },
      withDeleted: true,
    });
    
    if (!branch) {
      throw new NotFoundException(
        this.i18n.translate("test.BRANCH.NOT_FOUND"),
      );
    }
    
    branch.deletedAt = null;
    return await this.BranchRepository.save(branch);
  }

  async hardDeleteBranch(branchId: string): Promise<void> {
    try {
      const result = await this.BranchRepository.delete(branchId);
      
      if (result.affected === 0) {
        throw new NotFoundException(
          this.i18n.translate("test.BRANCH.NOT_FOUND"),
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        this.i18n.translate("test.BRANCH.DELETE_FAILED"),
      );
    }
  }

  async getDeletedBranches(): Promise<BranchEntity[]> {
    return this.BranchRepository.find({
      withDeleted: true,
      where: { deletedAt: Not(IsNull()) },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanTrash() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await this.BranchRepository.createQueryBuilder()
      .delete()
      .from(BranchEntity)
      .where("deleted_at IS NOT NULL AND deleted_at < :thirtyDaysAgo", { thirtyDaysAgo })
      .execute();
  }
}