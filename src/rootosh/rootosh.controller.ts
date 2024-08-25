import { Controller, Get, Post, Body, Patch, Param, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { CreateRootoshDto } from './dto/create-rootosh.dto';
import { RootoshEntity } from './entities/rootosh.entity';
import { RootoshService } from './rootosh.service';
import { UpdateRootoshDto } from './dto/update-rootosh.dto';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/Roles.decorator';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { Role } from '../user/utils/user.enum';
import { RolesGuard } from '../auth/guards/role.guards';

@ApiTags('rootosh')
@Controller('rootosh')
export class RootoshController {
  constructor( private readonly RootoshService: RootoshService
  ) {}

 
  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Post()
  async create(@Body() createRootoshDto: CreateRootoshDto): Promise<any> {
    return this.RootoshService.createRootosh(createRootoshDto);
  }
  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Get()
  async findAllRootosh(
    @Query('page') page: number = 1, // Default page is 1
    @Query('limit') limit: number = 10, // Default limit is 10
  ): Promise<{ data: RootoshEntity[], total: number, page: number, lastPage: number }> {

    
    return this.RootoshService.findAllRootosh(page, limit);
  }
  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<RootoshEntity> {
    return this.RootoshService.findOneRootosh(id);
  }
  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Put(':id')
  async update(
    @Param('id',) id: string,
    @Body() updateRootoshDto: UpdateRootoshDto,
  ): Promise<RootoshEntity> {
    return this.RootoshService.updateRootosh(id, updateRootoshDto);
  }
  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.RootoshService.removeRootosh(id);
  }
}
