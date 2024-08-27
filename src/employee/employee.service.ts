import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create.employee.dto';
import { UpdateEmployeeDto } from './dto/update.employee.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeEntity } from './entities/employee.entity';
import { BranchEntity } from '../branch/entities/branch.entity';
import { PositionEntity } from '../postion/entities/postion.entity';
import { In, Like, Repository } from 'typeorm';
import { EmployeeTypeEntity } from '../employetype/entities/employetype.entity';

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
  ) {}

  async createEmployee(createEmployeeDto: CreateEmployeeDto): Promise<EmployeeEntity> {
    const { 
      english_Name, 
      arabic_Name, 
      branch: branchId, 
      position: positionId, 
      employeeType: employeeTypeId // Add this if it's part of the DTO
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
        employeeType, // Include the employeeType
      });

      // Save the new employee
      return await this.employeeRepository.save(newEmployee);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create employee',error.stack);
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
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
  
    // Initialize the filter object for employeeType
    const employeeTypeFilter: any = {};
  
    // If employeeTypeName is provided, find matching EmployeeType IDs
    if (employeeTypeName) {
      const employeeTypes = await this.EmployeeTypeRepository.find({
        where: {
          typeEnglish: Like(`%${employeeTypeName}%`), // Adjust based on actual field name
        },
      });
  
      if (employeeTypes.length === 0) {
        return {
          items: [],
          total: 0,
          page,
          limit,
        };
      }
  
      const employeeTypeIds = employeeTypes.map(type => type.id);
      employeeTypeFilter.employeeType = {
        id: In(employeeTypeIds),
      };
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
      relations: ['branch', 'position', 'employeeType'], // Include 'employeeType'
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }



  async updateEmployee(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<EmployeeEntity> {
    // Find existing employee
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['branch', 'position', 'employeeType'],
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Update basic fields
    const { 
      english_Name, 
      arabic_Name, 
      branch: branchId, 
      position: positionId, 
      employeeType: employeeTypeId 
    } = updateEmployeeDto;

    if (english_Name) employee.english_Name = english_Name;
    if (arabic_Name) employee.arabic_Name = arabic_Name;
    if (branchId) {
      const branch = await this.branchRepository.findOne({ where: { id: branchId } });
      if (branch) employee.branch = branch;
    }
    if (positionId) {
      const position = await this.positionRepository.findOne({ where: { id: positionId } });
      if (position) employee.position = position;
    }
    if (employeeTypeId) {
      const employeeType = await this.EmployeeTypeRepository.findOne({ where: { id: employeeTypeId } });
      if (employeeType) employee.employeeType = employeeType;
    }

    try {
      // Save the updated employee
      return await this.employeeRepository.save(employee);
    } catch (error) {
      throw new InternalServerErrorException('Failed to update employee');
    }
  }
  async deleteEmployee(id: string): Promise<void> {
    const result = await this.employeeRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Optionally handle additional cleanup or logging here if needed

    // No need to explicitly handle success case since nothing is returned
  }


 
  
}

