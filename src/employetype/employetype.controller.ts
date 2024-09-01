import { Controller, Get, Post, Body, Patch, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { EmployetypeService } from './employetype.service';
import { CreateEmployeeTypeDto } from './dto/create-employetype.dto';
import { EmployeeTypeEntity } from './entities/employetype.entity';
import { UpdateEmployeeTypeDto } from './dto/update-employetype.dto';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/auth/guards/accessToken.guard';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { Role } from 'src/user/utils/user.enum';
import { Roles } from 'src/auth/Roles.decorator';


@ApiTags('employeetype')
@Controller('employeetype')
export class EmployetypeController {
  constructor(private readonly EmployetypeService: EmployetypeService) {}



  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Post()
  async create(@Body() createEmployeeTypeDto: CreateEmployeeTypeDto): Promise<EmployeeTypeEntity> {
    return this.EmployetypeService.create(createEmployeeTypeDto);
  }


  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Get()
  async findAll(): Promise<EmployeeTypeEntity[]> {
    return this.EmployetypeService.findAll();
  }


  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<EmployeeTypeEntity> {
    return this.EmployetypeService.findOne(id);
  }



  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() UpdateEmployeeTypeDto: UpdateEmployeeTypeDto
  ): Promise<EmployeeTypeEntity> {
    return this.EmployetypeService.update(id, UpdateEmployeeTypeDto);
  }



  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.EmployetypeService.remove(id);
  }
}
