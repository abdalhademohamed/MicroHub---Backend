import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeTypeEntity } from './entities/employetype.entity';
import { Repository } from 'typeorm';
import { CreateEmployeeTypeDto } from './dto/create-employetype.dto';
import { UpdateEmployeeDto } from '../employee/dto/update.employee.dto';
import { UpdateEmployeeTypeDto } from './dto/update-employetype.dto';
import { EmployeeEntity } from '../employee/entities/employee.entity';

@Injectable()
export class EmployetypeService {
  constructor(
    @InjectRepository(EmployeeTypeEntity)
    private readonly employeeTypeRepository: Repository<EmployeeTypeEntity>,

    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,

  ) {}
  async create(createEmployeeTypeDto: CreateEmployeeTypeDto): Promise<EmployeeTypeEntity> {
    const newEmployeeType = this.employeeTypeRepository.create(createEmployeeTypeDto);

    try {
      return await this.employeeTypeRepository.save(newEmployeeType);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create employee type');
    }
  }

  async findAll(): Promise<EmployeeTypeEntity[]> {
    return this.employeeTypeRepository.find();
  }

  async findOne(id: string): Promise<EmployeeTypeEntity> {
    const employeeType = await this.employeeTypeRepository.findOne({ where: { id } });
    if (!employeeType) {
      throw new NotFoundException('Employee Type not found');
    }
    return employeeType;
  }

  async update(id: string, updateEmployeeTypeDto: UpdateEmployeeTypeDto): Promise<EmployeeTypeEntity> {
    const employeeType = await this.findOne(id);

    Object.assign(employeeType, updateEmployeeTypeDto);

    try {
      return await this.employeeTypeRepository.save(employeeType);
    } catch (error) {
      throw new InternalServerErrorException('Failed to update employee type');
    }
  }

  async remove(id: string): Promise<void> {
    const employeeType = await this.findOne(id);
  
    // Update related employees to remove their reference to the employee type
    await this.employeeRepository.update({ employeeType: employeeType }, { employeeType: null });
  
    const result = await this.employeeTypeRepository.delete(id);
  
    if (result.affected === 0) {
      throw new NotFoundException('Employee Type not found');
    }
  }
}
