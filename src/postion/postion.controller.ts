import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { PostionService } from './postion.service';
import { UpdatePostionDto } from './dto/update.postion.dto';
import { PositionEntity } from './entities/postion.entity';
import { CreatePositionDto } from './dto/create.postion.dto';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { RolesGuard } from '../auth/guards/role.guards';
import { Role } from '../user/utils/user.enum';
import { Roles } from '../auth/Roles.decorator';
@ApiTags('postion')
@Controller('postion')
export class PostionController {
  constructor(private readonly postionService: PostionService) {}





  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  // Create a new position
  @Post()
  async createPosition(
    @Body() createPositionDto: CreatePositionDto,
  ): Promise<PositionEntity> {
    return this.postionService.createPosition(createPositionDto);
  }



  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  // Get all positions
  @Get()
  async getAllPositions(): Promise<PositionEntity[]> {
    return this.postionService.getAllPositions();
  }




  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Put(':id')
  async updatePosition(
    @Param('id') id: string,
    @Body() updatePositionDto: UpdatePostionDto,
  ): Promise<PositionEntity> {
    return this.postionService.updatePosition(id, updatePositionDto);
  }


  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  async removePosition(@Param('id') id: string): Promise<void> {
    return this.postionService.removePosition(id);
  }
  
}