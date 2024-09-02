import { Controller, Get, Post, Body, Patch, Param, Delete, InternalServerErrorException, Query, NotFoundException, Put, BadRequestException, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create.employee.dto';
import { UpdateEmployeeDto } from './dto/update.employee.dto';
import { EmployeeEntity } from './entities/employee.entity';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/Roles.decorator';
import { Role } from '../user/utils/user.enum';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { RolesGuard } from '../auth/guards/role.guards';



@ApiTags('employee')
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}


  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @UseInterceptors(FileInterceptor('image'))  // 'file' is the name of the field in the form-data
  @Post()
  async createEmployee(@Body() createEmployeeDto: CreateEmployeeDto,
  @UploadedFile() image: Express.Multer.File,
): Promise<EmployeeEntity> {
   

  if (!image) {
    throw new BadRequestException('Photo is required');
  }
  const folderName = 'employees'; // or any other dynamic name based on context
  const imageUrl = await this.employeeService.uploadImage(image,folderName);
  createEmployeeDto.image = imageUrl;

  return await this.employeeService.createEmployee(createEmployeeDto);  
  }




  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Get()
  async getAllEmployees(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('employeeType') employeeType?: string, // Optional query parameter for filtering
    @Query('branch') branchId?: string // Optional query parameter for filtering

  ): Promise<{
    items: EmployeeEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.employeeService.getAllEmployees(page, limit, employeeType,branchId);
  }



  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Get(':id')
  async getEmployeeById(@Param('id') id: string): Promise<EmployeeEntity> {
    
    
    return await this.employeeService.getEmployeeById(id);
  }


  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Put(':id')
  async updateEmployee(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto
  ): Promise<EmployeeEntity> {
    try {
      return await this.employeeService.updateEmployee(id, updateEmployeeDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      } else {
        throw new InternalServerErrorException('Failed to update employee', error.stack);
      }
    }
  }



  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  async deleteEmployee(@Param('id') id: string): Promise<void> {
   
  await this.employeeService.deleteEmployee(id);
  }
  
}
