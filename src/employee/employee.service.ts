import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create.employee.dto';
import { UpdateEmployeeDto } from './dto/update.employee.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeEntity } from './entities/employee.entity';
import { BranchEntity } from '../branch/entities/branch.entity';
import { PositionEntity } from '../postion/entities/postion.entity';
import { In, Like, Repository } from 'typeorm';
import { EmployeeTypeEntity } from '../employetype/entities/employetype.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

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

    private readonly CloudinaryService: CloudinaryService,

  ) {}

  async createEmployee(createEmployeeDto: CreateEmployeeDto): Promise<EmployeeEntity> {
    const { 
        english_Name, 
        arabic_Name, 
        branch: branchId, 
        position: positionId, 
        employeeType: employeeTypeId, 
        workingHours,
        email,
        countryCode,
        phoneNumber,
        password,
        image // Image URL or path
      } = createEmployeeDto;
  
    // Check if the branch exists
    const branch = await this.branchRepository.findOne({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  
    // Check if the position exists
    const position = await this.positionRepository.findOne({ where: { id: positionId } });
    if (!position) {
      throw new NotFoundException('Position not found');
    }
  
    // Check if the employee type exists
    const employeeType = await this.EmployeeTypeRepository.findOne({ where: { id: employeeTypeId } });
    if (!employeeType) {
      throw new NotFoundException('Employee Type not found');
    }
  
    try {
      // Create the new employee
      const newEmployee = this.employeeRepository.create({
        english_Name,
        arabic_Name,
        branch,
        position,
        employeeType,
        workingHours,
        email,
        countryCode,
        phoneNumber,
        password, // Typically hashed before saving
        image // Store the image URL or path
      });
  
      // Save the new employee
      return await this.employeeRepository.save(newEmployee);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create employee', error.stack);
    }
  }
  

  async getAllEmployees(
    page: number = 1,
    limit: number = 10,
    employeeTypeName?: string // Optional parameter for filtering
  ): Promise<{
    items: EmployeeEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Ensure page and limit are valid
    page = Math.max(page, 1);
    limit = Math.max(limit, 1);

    // Initialize the filter object for employeeType
    const employeeTypeFilter: any = {};

    // If employeeTypeName is provided, find matching EmployeeType IDs
    if (employeeTypeName) {
      const employeeTypes = await this.EmployeeTypeRepository.find({
        where: {
          typeEnglish: Like(`%${employeeTypeName}%`), // Adjust based on actual field name
        },
      });

      const employeeTypeIds = employeeTypes.map(type => type.id);
      if (employeeTypeIds.length > 0) {
        employeeTypeFilter.employeeType = In(employeeTypeIds);
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

    // Find and count employees with optional employeeType filtering
    const [items, total] = await this.employeeRepository.findAndCount({
      where: employeeTypeFilter,
      relations: ['branch', 'position', 'employeeType'], // Include relations if necessary
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

  
  async getEmployeeById(id: string): Promise<EmployeeEntity> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['branch', 'position', 'employeeType'], // Include related entities
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }


  
  // async updateEmployee(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<EmployeeEntity> {
  //   // Find existing employee
  //   const employee = await this.employeeRepository.findOne({
  //     where: { id },
  //     relations: ['branch', 'position', 'employeeType'],
  //   });

  //   if (!employee) {
  //     throw new NotFoundException(`Employee with ID ${id} not found`);
  //   }

  //   // Update basic fields
  //   const { 
  //     english_Name, 
  //     arabic_Name, 
  //     branch: branchId, 
  //     position: positionId, 
  //     employeeType: employeeTypeId,
  //     workingHours,
  //     email,
  //     countryCode,
  //     phoneNumber,
  //     password,
  //     image,
  //   } = updateEmployeeDto;

    

  //   // Update related entities only if IDs are provided and valid
  //   if (branchId) {
  //     const branch = await this.branchRepository.findOne({ where: { id: branchId } });
  //     if (branch) {
  //       employee.branch = branch;
  //     } else {
  //       throw new NotFoundException(`Branch with ID ${branchId} not found`);
  //     }
  //   }
    
  //   if (positionId) {
  //     const position = await this.positionRepository.findOne({ where: { id: positionId } });
  //     if (position) {
  //       employee.position = position;
  //     } else {
  //       throw new NotFoundException(`Position with ID ${positionId} not found`);
  //     }
  //   }

  //   if (employeeTypeId) {
  //     const employeeType = await this.EmployeeTypeRepository.findOne({ where: { id: employeeTypeId } });
  //     if (employeeType) {
  //       employee.employeeType = employeeType;
  //     } else {
  //       throw new NotFoundException(`EmployeeType with ID ${employeeTypeId} not found`);
  //     }
  //   }

  //   try {
  //     // Save the updated employee
  //     return await this.employeeRepository.save(employee);
  //   } catch (error) {
  //     console.error('Update Employee Error:', error);
  //     throw new InternalServerErrorException('Failed to update employee');
  //   }
  // }
  async deleteEmployee(id: string): Promise<void> {
    const result = await this.employeeRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Optionally handle additional cleanup or logging here if needed

    // No need to explicitly handle success case since nothing is returned
  }


  async uploadImage(file: Express.Multer.File,folderName:string): Promise<string> {
    const result = await this.CloudinaryService.uploadImage(file,folderName);
    return result.url;  // Return the URL of the uploaded image
  }

  
}

