import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PostionService } from './postion.service';
import { UpdatePostionDto } from './dto/update.postion.dto';
import { PositionEntity } from './entities/postion.entity';
import { CreatePositionDto } from './dto/create.postion.dto';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/auth/guards/accessToken.guard';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { Role } from 'src/user/utils/user.enum';
import { Roles } from 'src/auth/Roles.decorator';
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

  
}