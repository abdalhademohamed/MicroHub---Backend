import {
  BadRequestException,
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
import { EntityManager, getManager, In, Like, Repository } from "typeorm";
import { EmployeeTypeEntity } from "../employetype/entities/employetype.entity";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import * as bcrypt from "bcrypt";
import { AuthService } from "../auth/auth.service";
import { UserEntity } from "../user/entities/user.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { UserProfileDto } from "./dto/get.profile.dto";

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

    @InjectRepository(UserEntity)
    private readonly UserRepository: Repository<UserEntity>,
    private readonly CloudinaryService: CloudinaryService,
    private readonly AuthService: AuthService,
    private readonly entityManager: EntityManager, // Inject EntityManager for transactions
  ) {}

  async createEmployee(
    createEmployeeDto: CreateEmployeeDto,
    userId: string,
  ): Promise<any> {
    return await this.AuthService.createEmployee(createEmployeeDto, userId);
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async getAllEmployees(
    page: number = 1,
    limit: number = 10,
    employeeTypeName?: string,
    branchId?: string,
  ): Promise<{
    items: EmployeeEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Ensure page and limit are valid
    page = Math.max(page, 1);
    limit = Math.max(limit, 1);

    // Initialize the filter object
    const filter: any = {
      deletedAt: null, // Exclude soft-deleted employees
    };

    // If employeeTypeName is provided, find matching EmployeeType IDs
    if (employeeTypeName) {
      const employeeTypes = await this.EmployeeTypeRepository.find({
        where: {
          typeEnglish: Like(`%${employeeTypeName}%`), // Adjust based on actual field name
        },
      });

      const employeeTypeIds = employeeTypes.map((type) => type.id);
      if (employeeTypeIds.length > 0) {
        filter.employeeType = In(employeeTypeIds);
      } else {
        // If no matching employee types found, return empty result
        return {
          items: [],
          total: 0,
          page,
          limit,
        };
      }
    }

    // Add branch filtering if branchId is provided
    if (branchId) {
      filter.branch = { id: branchId }; // Modify this if branch is a relationship
    }

    // Find and count employees with optional filtering
    const [items, total] = await this.employeeRepository.findAndCount({
      where: filter, // Soft-deleted employees are excluded here
      relations: ["branch", "position", "employeeType"], // Include relations if necessary
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
    };
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

    return employee
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async updateEmployee(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
    userId: string,
    image: Express.Multer.File,
  ): Promise<EmployeeEntity> {
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
      } = updateEmployeeDto;
  
      employee.english_Name = english_Name ?? employee.english_Name;
      employee.arabic_Name = arabic_Name ?? employee.arabic_Name;
      employee.workingHours = workingHours ?? employee.workingHours;
      employee.countryCode = countryCode ?? employee.countryCode;
      employee.phoneNumber = phoneNumber ?? employee.phoneNumber;
      employee.available = available ?? employee.available;
  
      // Log the updated employee object for debugging
      console.log("Updated employee before save:", employee);
  
      // Step 4: Handle image upload
      if (image) {
        const folderName = "employee";
        try {
          const uploadedImage = await this.CloudinaryService.uploadImage(
            image,
            folderName,
          );
          employee.image = uploadedImage.url;
        } catch (error) {
          throw new InternalServerErrorException("Failed to upload image");
        }
      }
  
      // Step 5: Find and update user details
      const user = await this.UserRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException("User not found");
      }
  
      // Step 6: Update user email and username if necessary
      let isUserUpdated = false;
  
      if (email && email.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
        user.email = email.trim();
        employee.email=email.trim()
        isUserUpdated = true;
      }
  
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
  
      this.logChangedField("english_Name", originalEmployee, updatedEmployee, changedColumns, changesDetails);
      this.logChangedField("arabic_Name", originalEmployee, updatedEmployee, changedColumns, changesDetails);
      this.logChangedField("workingHours", originalEmployee, updatedEmployee, changedColumns, changesDetails);
      this.logChangedField("countryCode", originalEmployee, updatedEmployee, changedColumns, changesDetails);
      this.logChangedField("phoneNumber", originalEmployee, updatedEmployee, changedColumns, changesDetails);
      this.logChangedField("available", originalEmployee, updatedEmployee, changedColumns, changesDetails);
      this.logChangedField("image", originalEmployee, updatedEmployee, changedColumns, changesDetails);
  
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
      console.log("Employee updated successfully:", updatedEmployee);
  
      return updatedEmployee;
    } catch (error) {
      console.error("Update Employee Error:", error);
      throw new InternalServerErrorException(
        "An unexpected error occurred while updating the employee.",
      );
    }
  }
  
  
  // Helper method to track field changes
  private logChangedField(
    field: string,
    originalEmployee: EmployeeEntity,
    updatedEmployee: EmployeeEntity,
    changedColumns: string[],
    changesDetails: Record<string, any>,
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
    performingUserId: string,
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
          "Failed to soft delete employee",
        );
      }
    });
  }
  async uploadImage(
    file: Express.Multer.File,
    folderName: string,
  ): Promise<string> {
    const result = await this.CloudinaryService.uploadImage(file, folderName);
    return result.url; // Return the URL of the uploaded image
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async getProfile(userId: string): Promise<UserProfileDto> {
    // Retrieve the user from UserEntity repository
    const user = await this.UserRepository.findOne({
      where: { id: userId },
    });

    // Handle case where user is not found
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Initialize profile data
    const profileData: UserProfileDto = {
      username: user.username,
      email: user.email,
      phoneNumber: null,
      image: null,
      position: null,
    };

    // Retrieve additional employee data if user is an employee
    const employee = await this.employeeRepository.findOne({
      where: { id: userId },
      relations: ["position"],
    });

    // If employee record is found, enrich profile data
    if (employee) {
      profileData.phoneNumber = employee.phoneNumber || null;
      profileData.image = employee.image || null;
      profileData.position = employee.position || null; // Correctly assign PositionEntity
    }

    return profileData;
  }


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async countEmployees(branchId?: string): Promise<number> {
    const query = this.employeeRepository.createQueryBuilder('employee');

    if (branchId) {
      query.where('employee.branchId = :branchId', { branchId });
    }

    return await query.getCount();
  }
}
