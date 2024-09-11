import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdatePostionDto } from './dto/update.postion.dto';
import { PositionEntity } from './entities/postion.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePositionDto } from './dto/create.postion.dto';
import { EmployeeEntity } from '../employee/entities/employee.entity';

@Injectable()
export class PostionService {

  constructor(
    @InjectRepository(PositionEntity)
    private readonly PositionRepository: Repository<PositionEntity>,


    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,
  ) {}

  // Create a new position
  async createPosition(createPositionDto: CreatePositionDto): Promise<PositionEntity> {
    const position = this.PositionRepository.create(createPositionDto);
    return await this.PositionRepository.save(position);
  }

  // Get all positions
  async getAllPositions(): Promise<PositionEntity[]> {
    return await this.PositionRepository.find();
  }


    // Update a position
    async updatePosition(id: string, updatePositionDto: UpdatePostionDto): Promise<PositionEntity> {
      await this.PositionRepository.update(id, updatePositionDto);
      const updatedPosition = await this.PositionRepository.findOne({ where: { id } });
      if (!updatedPosition) {
        throw new NotFoundException('Position not found');
      }
      return updatedPosition;
    }
  
    // Delete a position  
    async removePosition(id: string): Promise<void> {
      const position = await this.PositionRepository.findOne({ where: { id } });
  
      if (!position) {
        throw new NotFoundException('Position not found');
      }
  
      // Update related employees to remove their reference to the position
      await this.employeeRepository.update({ position: position }, { position: null });
  
      const result = await this.PositionRepository.delete(id);
  
      if (result.affected === 0) {
        throw new NotFoundException('Position not found');
      }
    }
}
