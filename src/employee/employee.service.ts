import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CreateEmployeeDto } from "./dto/create.employee.dto";
import { UpdateEmployeeDto } from "./dto/update.employee.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { EmployeeEntity } from "./entities/employee.entity";
import { BranchEntity } from "../branch/entities/branch.entity";
import { PositionEntity } from "../postion/entities/postion.entity";
import {
  EntityManager,
  In,
  Like,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from "typeorm";
import { EmployeeTypeEntity } from "../employetype/entities/employetype.entity";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import * as bcrypt from "bcrypt";
import { AuthService } from "../auth/auth.service";
import { UserEntity } from "../user/entities/user.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { GetUserProfileDto } from "./dto/get.profile.dto";
import { SlotService } from "../slots/slots.service";
import { Role } from "../user/utils/user.enum";
import { response } from "express";
import { Postion } from "../postion/utils/postion.enum";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ReservationEntity } from "../reservation/entities/reservation.entity";
import { SlotsEntity } from "../slots/entities/slots.entity";
import { WorkingEntity } from "../slots/entities/working.entity";
import { OrderStatus } from "../orders/utils/order.status.enum";
import { ReviewEntity } from "../reviews/entities/review.entity";

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,

    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,

    @InjectRepository(PositionEntity)
    private readonly positionRepository: Repository<PositionEntity>,

    @InjectRepository(EmployeeTypeEntity)
    private readonly EmployeeTypeRepository: Repository<EmployeeTypeEntity>,

    @InjectRepository(AuditLogEntity)
    private readonly AuditLogRepository: Repository<AuditLogEntity>,

    @InjectRepository(ReservationEntity)
    private readonly reservationRepository: Repository<ReservationEntity>,

    @InjectRepository(UserEntity)
    private readonly UserRepository: Repository<UserEntity>,
    private readonly CloudinaryService: CloudinaryService,
    private readonly AuthService: AuthService,
    private readonly entityManager: EntityManager, // Inject EntityManager for transactions
    private readonly slotService: SlotService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(SlotsEntity)
    private readonly SlotRepository: Repository<SlotsEntity>,
    @InjectRepository(WorkingEntity)
    private readonly WorkingRepository: Repository<WorkingEntity>
  ) {}

  async createEmployee(
    createEmployeeDto: CreateEmployeeDto,
    userId: string
  ): Promise<any> {
    try {
      return await this.AuthService.createEmployee(createEmployeeDto, userId);
    } catch (error) {
      // Log the error
      console.error("Error occurred while creating employee:", error);

      // Categorize the error based on the instance
      if (error instanceof NotFoundException) {
        throw new NotFoundException({
          message: "Failed to create employee",
          error: "The specified resource was not found.",
          statusCode: 404,
        });
      } else if (error instanceof BadRequestException) {
        throw new BadRequestException({
          message: "Failed to create employee",
          error: "Invalid data provided. Please check your input.",
          statusCode: 400,
        });
      } else if (error instanceof ConflictException) {
        // Directly specify the conflict error message
        throw new ConflictException({
          message: "Failed to create employee",
          error: "A user with this email already exists.",
          statusCode: 409,
        });
      } else {
        // Handle unexpected errors
        throw new InternalServerErrorException({
          message: "Failed to create employee",
          error: error.response.error,
          statusCode: 500,
        });
      }
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async getAllEmployees(
    page: number = 1,
    limit: number = 10,
    employeeTypeName?: string,
    branchId?: string,
    role?: Role,
    englishName?: string,
    userId?: string
  ): Promise<{
    items: EmployeeEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Ensure page and limit are valid
    page = Math.max(page, 1);
    limit = Math.max(limit, 1);

    const filter: any = { deletedAt: null };

    // Get the requesting user's details
    const requestingUser = await this.employeeRepository.findOne({
      where: { id: userId },
      relations: ['branch', 'position'],
    });

    // Only apply branch filter if requestingUser exists and is a receptionist
    if (requestingUser?.position?.postion === Postion.RECEPTIONIST) {
      filter.branch = { id: requestingUser.branch.id };
    } else if (branchId) {
      const branch = await this.branchRepository.findOne({
        where: { id: branchId },
      });
      if (!branch) {
        throw new NotFoundException(`Branch with id ${branchId} not found`);
      }
      filter.branch = { id: branchId };
    }

    // Add specific name filters
    if (englishName) {
      filter.english_Name = Like(`%${englishName}%`);
    }
   

    // Handle employeeTypeName filter
    if (employeeTypeName) {
      const employeeTypes = await this.EmployeeTypeRepository.find({
        where: {
          typeEnglish: Like(`%${employeeTypeName}%`),
        },
      });

      const employeeTypeIds = employeeTypes.map((type) => type.id);
      if (employeeTypeIds.length > 0) {
        filter.employeeType = In(employeeTypeIds);
      } else {
        return {
          items: [],
          total: 0,
          page,
          limit,
        };
      }
    }

    // Add role filter if provided and valid
    if (role) {
      if (!(role in Role)) {
        throw new BadRequestException(`Invalid role: ${role}`);
      }
      filter.role = role; // Filter employees by role
    }

    try {
      const [items, total] = await this.employeeRepository.findAndCount({
        where: filter,
        relations: ["branch", "position", "employeeType"],
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      // Handle other errors
      throw new BadRequestException(
        `Error fetching employees: ${error.message}`
      );
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async getEmployeeById(id: string): Promise<EmployeeEntity> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ["branch", "position", "employeeType"], // Include related entities
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async updateEmployee(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
    userId: string,
    image: Express.Multer.File
  ): Promise<
    EmployeeEntity | { message: string; error: string; statusCode: number }
  > {
    try {
      // Step 1: Find the employee by ID
      const employee = await this.employeeRepository.findOne({
        where: { id },
        relations: ["branch", "position", "employeeType"],
      });

      if (!employee) {
        throw new NotFoundException(`Employee with ID ${id} not found.`);
      }

      // Step 2: Track original values for auditing purposes
      const originalEmployee = { ...employee };

      // Step 3: Destructure and update employee details from DTO
      const {
        english_Name,
        arabic_Name,
        workingHours,
        countryCode,
        phoneNumber,
        available,
        email,
        password,
        employeeType, // Update employee type
        branchId, // Update branch
        position, // Update position
      } = updateEmployeeDto;

      // Check if updating to artist position
      if (position) {
        const newPosition = await this.positionRepository.findOne({
          where: { id: position },
        });
        if (!newPosition) {
          throw new NotFoundException(
            `Position with ID ${position} not found.`
          );
        }
        console.log(newPosition.postion);
        console.log(employee.position.postion);

        // If the new position is not "artist" and the employee is the only artist in the branch
        if (
          newPosition.postion !== Postion.ARTIST &&
          employee.position.postion === Postion.ARTIST
        ) {
          const artistCount = await this.employeeRepository.count({
            where: {
              position: { postion: Postion.ARTIST },
              branch: { id: employee.branch.id },
            },
          });

          if (artistCount === 1) {
            return {
              message: "BadRequestException",
              error:
                "Cannot change position to artist as this employee is the only artist in the branch.",
              statusCode: 400,
            };
          }
        }

        employee.position = newPosition; // Update the employee's position
        employee.role = this.determineRoleFromPosition(newPosition);
      }

      employee.english_Name = english_Name ?? employee.english_Name;
      employee.arabic_Name = arabic_Name ?? employee.arabic_Name;
      employee.workingHours = workingHours ?? employee.workingHours;
      employee.countryCode = countryCode ?? employee.countryCode;
      employee.phoneNumber = phoneNumber ?? employee.phoneNumber;
      employee.available = available ?? employee.available;

      // Update the branch if branchId is provided
      if (branchId) {
        const newBranch = await this.branchRepository.findOne({
          where: { id: branchId },
        });
        if (!newBranch) {
          throw new NotFoundException(`Branch with ID ${branchId} not found.`);
        }
        if (position) {
          if (employee.position.postion === Postion.ARTIST) {
            const artistCount = await this.employeeRepository.count({
              where: {
                position: { postion: Postion.ARTIST },
                branch: { id: employee.branch.id },
              },
            });

            if (artistCount === 1) {
              return {
                message: "BadRequestException",
                error:
                  "Cannot change position to artist as this employee is the only artist in the branch.",
                statusCode: 400,
              };
            }
            this.eventEmitter.emit("artist:hours", {
              duration: employee.workingHours * 60,
              branchId: employee.branch.id,
            });

            this.eventEmitter.emit("artist:created", employee);
          }
        }

        // const artistCount = await this.employeeRepository.count({
        //   where: {
        //     position: { postion: Postion.ARTIST },
        //     branch: { id: employee.branch.id },
        //   },
        // });

        // if (artistCount === 1) {
        //   return {
        //     message: "BadRequestException",
        //     error: "Cannot change branch of artist as this employee is the only artist in the branch.",
        //     statusCode: 400,
        //   };
        // }
        employee.branch = newBranch; // Update the employee's branch
      }

      // Step 4: Handle image upload
      if (image) {
        const folderName = "employee";
        try {
          const uploadedImage = await this.CloudinaryService.uploadImage(
            image,
            folderName
          );
          employee.image = uploadedImage.url;
        } catch (error) {
          return {
            message: "Failed to upload image",
            error: "InternalServerErrorException",
            statusCode: 500,
          };
        }
      }

      // Step 5: Find and update user details
      const user = await this.UserRepository.findOne({ where: { id } });
      if (!user) {
        return {
          message: "User not found",
          error: "NotFoundException",
          statusCode: 404,
        };
      }

      // Step 6: Update user email and username if necessary
      let isUserUpdated = false;

      if (
        email &&
        email.trim().toLowerCase() !== user.email.trim().toLowerCase()
      ) {
        user.email = email.trim();
        employee.email = email.trim();
        isUserUpdated = true;
      }
      // if (
      //   email &&
      //   email.trim().toLowerCase() === user.email.trim().toLowerCase()
      // ) {
      //   return {
      //     message: "BadRequestException",
      //     error: "this is your current email",
      //     statusCode: 400,
      //   };
      // }

      if (english_Name && english_Name !== user.username) {
        user.username = english_Name;
        isUserUpdated = true;
      }

      if (password) {
        user.password = await bcrypt.hash(password, 10);
        isUserUpdated = true;
      }

      // Save the user entity if any updates were made
      if (isUserUpdated) {
        await this.UserRepository.save(user);
      }

      // Step 7: Save updated employee details
      const updatedEmployee = await this.employeeRepository.save(employee);

      // Step 8: Audit log - Track changes
      const changedColumns = [];
      const changesDetails = {};

      this.logChangedField(
        "english_Name",
        originalEmployee,
        updatedEmployee,
        changedColumns,
        changesDetails
      );
      this.logChangedField(
        "arabic_Name",
        originalEmployee,
        updatedEmployee,
        changedColumns,
        changesDetails
      );
      this.logChangedField(
        "workingHours",
        originalEmployee,
        updatedEmployee,
        changedColumns,
        changesDetails
      );
      this.logChangedField(
        "countryCode",
        originalEmployee,
        updatedEmployee,
        changedColumns,
        changesDetails
      );
      this.logChangedField(
        "phoneNumber",
        originalEmployee,
        updatedEmployee,
        changedColumns,
        changesDetails
      );
      this.logChangedField(
        "available",
        originalEmployee,
        updatedEmployee,
        changedColumns,
        changesDetails
      );
      this.logChangedField(
        "image",
        originalEmployee,
        updatedEmployee,
        changedColumns,
        changesDetails
      );
      this.logChangedField(
        "branch",
        originalEmployee,
        updatedEmployee,
        changedColumns,
        changesDetails
      ); // Track branch changes
      this.logChangedField(
        "position",
        originalEmployee,
        updatedEmployee,
        changedColumns,
        changesDetails
      ); // Track position changes

      // Step 9: Create an audit log entry
      const auditLog = new AuditLogEntity();
      auditLog.tableName = "employee";
      auditLog.action = "UPDATE";
      auditLog.entityId = employee.id;
      auditLog.performedBy = userId;
      auditLog.changedColumns = changedColumns;
      auditLog.changesDetails = changesDetails;

      if (userId) {
        auditLog.userDetails = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        };
      }
      await this.AuditLogRepository.save(auditLog);

      // Log the updated employee after saving
      // console.log("Employee updated successfully:", updatedEmployee);

      return updatedEmployee;
    } catch (error) {
      console.error("Update Employee Error:", error);

      // Directly return a formatted error response
      return {
        message: "Failed to update employee",
        error: error.message || "InternalServerErrorException",
        statusCode: error.getStatus ? error.getStatus() : 500,
      };
    }
  }
  async updateArtistWorkingHours(artistId: string, workingHours: number) {
    const employee = await this.employeeRepository.findOne({
      where: { id: artistId, role: Role.ARTIST },
      relations: ["branch"],
    });
    const currentWorkingHours = employee.workingHours;
    if (!employee) {
      throw new NotFoundException(`Artist with ID ${artistId} not found.`);
    }
    if (currentWorkingHours == workingHours) {
      throw new HttpException("invalid working hours ", 400);
    }
    // const sum = await this.employeeRepository.sum('workingHours', { branch: { id: employee.branch.id }, role: Role.ARTIST });
    if (currentWorkingHours < workingHours) {
      employee.workingHours = workingHours - currentWorkingHours;
      this.eventEmitter.emit("artist:created", employee);
      employee.workingHours = workingHours;
      await this.employeeRepository.save(employee);
    } else if (currentWorkingHours > workingHours) {
      const wH = (currentWorkingHours - workingHours) * 60;
      const today = new Date();
      const slots = await this.SlotRepository.find({
        where: {
          branch: { id: employee.branch.id },
          day: MoreThan(today.getDate()),
          month: MoreThanOrEqual(today.getMonth() + 1),
          year: MoreThanOrEqual(today.getFullYear()),
        },
        relations: ["branch", "workingEntity"],
      });
      for (var i = 0; i < slots.length; i++) {
        const sum = slots[i].workingEntity.reduce((acc, slot) => {
          return acc + slot.duration;
        }, 0);
        if (wH > sum) {
          throw new HttpException("invalid working entity ", 400);
        }
      }
      this.eventEmitter.emit("artist:hours", {
        duration: wH,
        branchId: employee.branch.id,
      });
    }
    return { status: "working hours updated" };
  }

  private determineRoleFromPosition(position: PositionEntity): Role {
    // Example mapping logic based on the Postion enum
    switch (position.postion) {
      case Postion.ADMIN:
        return Role.ADMIN;
      case Postion.SUPERADMIN:
        return Role.SUPERADMIN;
      case Postion.BRANCHMANAGER:
        return Role.BRANCHMANAGER;
      case Postion.COORDINATOR:
        return Role.COORDINATOR;
      case Postion.RECEPTIONIST:
        return Role.RECEPTIONIST;
      case Postion.ACCOUNTANT:
        return Role.ACCOUNTANT;
      case Postion.ARTIST:
        return Role.ARTIST;
      case Postion.ARTISTMANAGER:
        return Role.ARTISTMANAGER;
      case Postion.TABLEMANAGER:
        return Role.TABLEMANAGER;
    }
  }
  // Helper method to track field changes
  private logChangedField(
    field: string,
    originalEmployee: EmployeeEntity,
    updatedEmployee: EmployeeEntity,
    changedColumns: string[],
    changesDetails: Record<string, any>
  ) {
    if (originalEmployee[field] !== updatedEmployee[field]) {
      changedColumns.push(field);
      changesDetails[field] = {
        oldValue: originalEmployee[field],
        newValue: updatedEmployee[field],
      };
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async softDeleteEmployeeByEmployeeId(
    employeeId: string,
    performingUserId: string
  ): Promise<void> {
    let employee: EmployeeEntity;
    let user: UserEntity;

    await this.entityManager.transaction(async (transactionalEntityManager) => {
      try {
        // Load the employee associated with the employeeId
        employee = await transactionalEntityManager.findOne(EmployeeEntity, {
          where: { id: employeeId },
          relations: ["branch"],
        });
        if (!employee) {
          throw new NotFoundException("Employee not found");
        }

        // Load the user entity
        user = await transactionalEntityManager.findOne(UserEntity, {
          where: { id: performingUserId },
        });
        if (!user) {
          throw new NotFoundException("User not found");
        }

        // Perform the soft delete by setting the deletedAt field
        employee.deletedAt = new Date();

        await transactionalEntityManager.save(EmployeeEntity, employee);

        // Create an audit log entry for the deletion
        const auditLog = new AuditLogEntity();
        auditLog.tableName = "employee"; // Log the employee table
        auditLog.action = "DELETE";
        auditLog.entityId = employeeId; // Use the ID of the entity being deleted
        auditLog.performedBy = performingUserId; // Set the user who performed the delete
        auditLog.changedColumns = ["deletedAt"];
        auditLog.changesDetails = {
          deletedAt: {
            oldValue: null,
            newValue: employee.deletedAt,
          },
        };

        // Fetch user details if needed
        if (performingUserId) {
          const performingUser = await this.UserRepository.findOne({
            where: { id: performingUserId },
          });
          if (performingUser) {
            auditLog.userDetails = {
              id: performingUser.id,
              username: performingUser.username,
              email: performingUser.email,
              role: performingUser.role,
            };
          }
        }

        await transactionalEntityManager.save(AuditLogEntity, auditLog);
      } catch (error) {
        console.error("Error performing soft delete on employee:", error);
        throw new InternalServerErrorException(
          "Failed to soft delete employee"
        );
      }
    });
  }
  async uploadImage(
    file: Express.Multer.File,
    folderName: string
  ): Promise<string> {
    const result = await this.CloudinaryService.uploadImage(file, folderName);
    return result.url; // Return the URL of the uploaded image
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async getProfile(userId: string): Promise<GetUserProfileDto> {
    try {
      const employeeProfile = await this.employeeRepository
        .createQueryBuilder('employee')
        .leftJoinAndSelect('employee.position', 'position')
        .leftJoinAndSelect('employee.reviews', 'reviews')
        .leftJoinAndSelect('employee.branch', 'branch')
        .where('employee.id = :userId', { userId })
        .andWhere('employee.deletedAt IS NULL')
        .select([
          'employee.id',
          'employee.english_Name',
          'employee.arabic_Name',
          'employee.phoneNumber',
          'employee.image',
          'employee.available',
          'employee.status',
          'employee.workingHours',
          'position',
          'branch.id',
          'branch.name',
          'branch.location',
          'branch.image',
          'reviews.id',
          'reviews.rating',
          'reviews.comment_Before',
          'reviews.comment_After',
          'reviews.orderFirstTime',
          'reviews.createdAt'
        ])
        .getOne();

      if (!employeeProfile) {
        throw new NotFoundException('Employee profile not found');
      }

      // Calculate average ratings and total reviews
      const reviews = employeeProfile.reviews || [];
      const totalReviews = reviews.length;
      const ratings = reviews.map(review => review.rating);
      const oldestAvgRating = ratings.length > 0 ? ratings[0] : 0;
      const newestAvgRating = ratings.length > 0 ? ratings[ratings.length - 1] : 0;

      // Get user data
      const userData = await this.UserRepository.findOne({
        where: { id: userId },
        select: ['username', 'email', 'role']
      });

      if (!userData) {
        throw new NotFoundException('User data not found');
      }

      return {
        id: employeeProfile.id,
        username: userData.username,
        email: userData.email,
        phoneNumber: employeeProfile.phoneNumber,
        image: employeeProfile.image,
        position: employeeProfile.position,
        branch: employeeProfile.branch,
        workingHours: employeeProfile.workingHours,
        totalReviews,
        oldestAvgRating,
        newestAvgRating,
      };
    } catch (error) {
      console.error('Error in getProfile:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve profile data',
        error.message
      );
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async countEmployees(branchId?: string): Promise<number> {
    const query = this.employeeRepository.createQueryBuilder("employee");

    if (branchId) {
      query.where("employee.branchId = :branchId", { branchId });
    }

    return await query.getCount();
  }

  async getTopArtistsWithCompletedOrders(
    fromDate?: Date,
    toDate?: Date
  ): Promise<any[]> {
    const queryBuilder = this.employeeRepository
      .createQueryBuilder("employee")
      .leftJoinAndSelect("employee.orders", "order") // Join orders related to the employee
      .leftJoinAndSelect("employee.position", "position") // Join position related to the employee
      .leftJoinAndSelect("employee.branch", "branch") // Join branch
      .leftJoinAndSelect("employee.employeeType", "employeeType") // Join employeeType
      .where("position.postion = :position", { position: Postion.ARTIST }) // Filter by position
      .andWhere("order.status IN (:...statuses)", { 
        statuses: [OrderStatus.Completed, OrderStatus.Reviewed] 
      }) // Filter by multiple order statuses
      .select([
        "employee",
        "branch",
        "position",
        "employeeType",
        'COUNT(order.id) AS "completedOrdersCount"', // Explicitly alias the count
      ])
      .groupBy("employee.id") // Group by employee ID
      .addGroupBy("position.id") // Group by position ID
      .addGroupBy("branch.id") // Group by branch ID
      .addGroupBy("employeeType.id") // Group by employeeType ID
      .orderBy('"completedOrdersCount"', 'DESC') // Order by the count of completed orders
      .limit(5); // Limit to the top 5 employees
  
    // // Add date filtering only if fromDate or toDate are provided
    // if (fromDate) {
    //   queryBuilder.andWhere("order.createdAt >= :fromDate", { 
    //     fromDate: fromDate.toISOString(),
    //   });
    // }
    // if (toDate) {
    //   queryBuilder.andWhere("order.createdAt <= :toDate", { 
    //     toDate: toDate.toISOString(),
    //   });
    // }
   // Set time to start of day for fromDate
   if (fromDate) {
    const startOfDay = new Date(fromDate);
    startOfDay.setHours(0, 0, 0, 0);
    queryBuilder.andWhere('order.createdAt >= :fromDate', { 
      fromDate: startOfDay 
    });
  }

  // Set time to end of day for toDate
  if (toDate) {
    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);
    queryBuilder.andWhere('order.createdAt <= :toDate', { 
      toDate: endOfDay 
    });
  }
  
    const topArtists = await queryBuilder.getRawMany(); // Use getRawMany to get raw results
  
    // Transform the raw results into the desired structure
    return topArtists.map((raw) => {
      return {
        id: raw.employee_id,
        username: raw.employee_username,
        email: raw.employee_email,
        role: raw.employee_role,
        english_Name: raw.employee_english_Name,
        arabic_Name: raw.employee_arabic_Name,
        workingHours: raw.employee_workingHours,
        phoneNumber: raw.employee_phoneNumber,
        image: raw.employee_image,
        speciality: raw.employee_speciality,
        available: raw.employee_available,
        totalReviews: raw.employee_totalReviews,
        status: raw.employee_status,
        oldestAvgRating: raw.employee_oldestAvgRating,
        newestAvgRating: raw.employee_newestAvgRating,
        branch: {
          id: raw.branch_id,
          name: raw.branch_name,
          location: raw.branch_location,
          image: raw.branch_image,
        },
        position: {
          id: raw.position_id,
          postion: raw.position_postion,
          positionInEnglish: raw.position_positionInEnglish,
          positionInArabic: raw.position_positionInArabic,
        },
        employeeType: {
          id: raw.employeeType_id,
          typeEnglish: raw.employeeType_typeEnglish,
          typeArabic: raw.employeeType_typeArabic,
        },
        completedOrdersCount: parseInt(raw.completedOrdersCount, 10), // Convert count to a number
      };
    });
  }
  

  async getArtistsWithReviews() {
    return this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect("employee.position", "position") // Join position related to the employee
      .leftJoinAndSelect('employee.reviews', 'reviews')
      .where("position.postion = :position", { position: Postion.ARTIST }) // Filter by position
      .loadRelationCountAndMap('employee.totalReviews', 'employee.reviews')
      .addSelect([
        'employee.oldestAvgRating',
        'employee.newestAvgRating',
        'reviews.rating',
        'reviews.comment_Before',
        'reviews.comment_After',
        'reviews.orderFirstTime',
      ])
      .addSelect((subQuery) => {
        return subQuery
          .select('AVG(reviews.rating)', 'averageRating')
          .from(ReviewEntity, 'reviews')
          .where('reviews.employeeId = employee.id');
      }, 'employee.avgRating')
      .addSelect((subQuery) => {
        return subQuery
          .select('reviews.rating', 'newestAvgRating')
          .from(ReviewEntity, 'reviews')
          .where('reviews.employeeId = employee.id')
          .orderBy('reviews.createdAt', 'DESC')
          .limit(1);
      }, 'employee.newestAvgRating')
      .addSelect((subQuery) => {
        return subQuery
          .select('reviews.rating', 'oldestAvgRating')
          .from(ReviewEntity, 'reviews')
          .where('reviews.employeeId = employee.id')
          .orderBy('reviews.createdAt', 'ASC')
          .limit(1);
      }, 'employee.oldestAvgRating')
      .getMany();
  }
}
