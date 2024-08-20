import { Controller, Get, Post, Body, Patch, Param, Put, Delete } from '@nestjs/common';
import { CreateRootoshDto } from './dto/create-rootosh.dto';
import { RootoshEntity } from './entities/rootosh.entity';
import { RootoshService } from './rootosh.service';
import { UpdateRootoshDto } from './dto/update-rootosh.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('rootosh')
@Controller('rootosh')
export class RootoshController {
  
  private readonly RootoshService: RootoshService

  @Post()
  async create(@Body() createRootoshDto: CreateRootoshDto): Promise<RootoshEntity> {
    return this.RootoshService.createRootosh(createRootoshDto);
  }

  @Get()
  async findAll(): Promise<RootoshEntity[]> {
    return this.RootoshService.findAllRootosh();
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<RootoshEntity> {
    return this.RootoshService.findOneRootosh(id);
  }

  @Put(':id')
  async update(
    @Param('id',) id: number,
    @Body() updateRootoshDto: UpdateRootoshDto,
  ): Promise<RootoshEntity> {
    return this.RootoshService.updateRootosh(id, updateRootoshDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: number): Promise<void> {
    return this.RootoshService.removeRootosh(id);
  }
}
