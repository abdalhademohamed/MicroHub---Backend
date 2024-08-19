import { Injectable } from '@nestjs/common';
import { UpdatePostionDto } from './dto/update.postion.dto';
import { PositionEntity } from './entities/postion.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePositionDto } from './dto/create.postion.dto';

@Injectable()
export class PostionService {

  constructor(
    @InjectRepository(PositionEntity)
    private readonly PositionRepository: Repository<PositionEntity>,
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
}
