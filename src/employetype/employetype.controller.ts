import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { EmployetypeService } from './employetype.service';
import { CreateEmployeeTypeDto } from './dto/create-employetype.dto';
import { EmployeeTypeEntity } from './entities/employetype.entity';
import { UpdateEmployeeTypeDto } from './dto/update-employetype.dto';
import { ApiTags } from '@nestjs/swagger';


@ApiTags('employeetype')
@Controller('employeetype')
export class EmployetypeController {
  constructor(private readonly EmployetypeService: EmployetypeService) {}

  @Post()
  async create(@Body() createEmployeeTypeDto: CreateEmployeeTypeDto): Promise<EmployeeTypeEntity> {
    return this.EmployetypeService.create(createEmployeeTypeDto);
  }

  @Get()
  async findAll(): Promise<EmployeeTypeEntity[]> {
    return this.EmployetypeService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<EmployeeTypeEntity> {
    return this.EmployetypeService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() UpdateEmployeeTypeDto: UpdateEmployeeTypeDto
  ): Promise<EmployeeTypeEntity> {
    return this.EmployetypeService.update(id, UpdateEmployeeTypeDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.EmployetypeService.remove(id);
  }
}
