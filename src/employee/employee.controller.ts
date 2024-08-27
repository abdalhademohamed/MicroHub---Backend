import { Controller, Get, Post, Body, Patch, Param, Delete, InternalServerErrorException, Query, NotFoundException, Put, BadRequestException } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create.employee.dto';
import { UpdateEmployeeDto } from './dto/update.employee.dto';
import { EmployeeEntity } from './entities/employee.entity';
import { ApiTags } from '@nestjs/swagger';



@ApiTags('employee')
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  async createEmployee(@Body() createEmployeeDto: CreateEmployeeDto): Promise<EmployeeEntity> {
   
      return await this.employeeService.createEmployee(createEmployeeDto);  
  }

  @Get()
  async getAllEmployees(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('employeeType') employeeType?: string // Optional query parameter for filtering
  ): Promise<{
    data: EmployeeEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.employeeService.getAllEmployees(page, limit, employeeType);
  }

  @Get(':id')
  async getEmployeeById(@Param('id') id: string): Promise<EmployeeEntity> {
    
    
    return await this.employeeService.getEmployeeById(id);
  }

  @Put(':id')
  async updateEmployee(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto
  ): Promise<EmployeeEntity> {
    
    return await this.employeeService.updateEmployee(id, updateEmployeeDto);
   
  }

  @Delete(':id')
  async deleteEmployee(@Param('id') id: string): Promise<void> {
   
  await this.employeeService.deleteEmployee(id);
  }
  
}
