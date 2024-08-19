import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeEntity } from './entities/employee.entity';
import { BranchEntity } from 'src/branch/entities/branch.entity';
import { PositionEntity } from 'src/postion/entities/postion.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,

    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,

    @InjectRepository(PositionEntity)
    private readonly positionRepository: Repository<PositionEntity>,
  ) {}

  async createEmployee(createEmployeeDto: CreateEmployeeDto): Promise<EmployeeEntity> {
  
    const { 
      english_Name, 
      arabic_Name, 
      employee_Type_Arabic, 
      employee_Type_English, 
      branch: branchId, 
      position: positionId 
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

    try {
      // Create the new employee
      const newEmployee = this.employeeRepository.create({
        english_Name,
        arabic_Name,
        employee_Type_English,
        employee_Type_Arabic,
        branch,
        position,
      });

      // Save the new employee
      return await this.employeeRepository.save(newEmployee);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create employee');
    }
  }

  async getAllEmployees(page: number = 1, limit: number = 10): Promise<{
    data: EmployeeEntity[];
    total: number;
    page: number;
    limit: number;}> {
    const [data, total] = await this.employeeRepository.findAndCount({
      relations: ['branch', 'position'],
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }
  async getEmployeeById(id: string): Promise<EmployeeEntity> {
    const employee =await this.employeeRepository.findOne({
      where: { id },
      relations: ['branch', 'position'],
    })
    
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee
  }




  async updateEmployee(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<EmployeeEntity> {
    const result = await this.employeeRepository.update(id, updateEmployeeDto);

    if (result.affected === 0) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Return the updated employee
    return await this.employeeRepository.findOne({ where: { id }, relations: ['branch', 'position'] });
  }
  async deleteEmployee(id: string): Promise<void> {
    // Check if the employee exists
    const employee = await this.employeeRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Delete the employee
    await this.employeeRepository.remove(employee);
  }

}

