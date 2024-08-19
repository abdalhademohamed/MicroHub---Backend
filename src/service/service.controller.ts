import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Put, HttpCode, HttpStatus } from '@nestjs/common';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceEntity } from './entities/service.entity';
import { PaginateResultDto } from '../branch/dto/paginate.result.dto';
import { ApiTags } from '@nestjs/swagger';
@ApiTags('service')

@Controller('service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}



  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createService(
    @Body() createServiceDto: CreateServiceDto
  ): Promise<ServiceEntity> {
    return this.serviceService.createService(createServiceDto);
  }
  
  @Get('sort')
  async getAllServices(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sortBy') sortBy: string = 'english_Name',  // Default sorting by 'englishName'
    @Query('order') order: 'ASC' | 'DESC' = 'ASC'  // Default order 'ASC'
  ): Promise<PaginateResultDto<ServiceEntity>> {
    return this.serviceService.getAllServices(page, limit, sortBy, order);
  }


  @Put(':id')
  async updateService(
    @Param('id') id: string,
    @Body() updateServiceDto: CreateServiceDto
  ): Promise<ServiceEntity> {
    return this.serviceService.updateService(id, updateServiceDto);
  }


  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteService(
    @Param('id') id: string
  ): Promise<void> {
    return this.serviceService.deleteService(id);
  }
}
