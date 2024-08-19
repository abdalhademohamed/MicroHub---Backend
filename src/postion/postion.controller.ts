import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PostionService } from './postion.service';
import { UpdatePostionDto } from './dto/update.postion.dto';
import { PositionEntity } from './entities/postion.entity';
import { CreatePositionDto } from './dto/create.postion.dto';
import { ApiTags } from '@nestjs/swagger';
@ApiTags('postion')
@Controller('postion')
export class PostionController {
  constructor(private readonly postionService: PostionService) {}

  // Create a new position
  @Post()
  async createPosition(
    @Body() createPositionDto: CreatePositionDto,
  ): Promise<PositionEntity> {
    return this.postionService.createPosition(createPositionDto);
  }

  // Get all positions
  @Get()
  async getAllPositions(): Promise<PositionEntity[]> {
    return this.postionService.getAllPositions();
  }

  
}