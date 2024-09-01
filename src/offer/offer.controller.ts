import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Query, UseGuards } from '@nestjs/common';
import { OfferService } from './offer.service';
import { CreateOfferDto } from './dto/create.offer.dto';
import { UpdateOfferDto } from './dto/update.offer.dto';
import { ApiTags } from '@nestjs/swagger';
import { OfferEntity } from './entities/offer.entity';
import { UpdateIsActiveDto } from './dto/update.active.dto';
import { AccessTokenGuard } from 'src/auth/guards/accessToken.guard';
import { RolesGuard } from 'src/auth/guards/role.guards';
import { Role } from 'src/user/utils/user.enum';
import { Roles } from 'src/auth/Roles.decorator';



@ApiTags('offer')
@Controller('offer')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}



  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Post()
  async create(@Body() createOfferDto: CreateOfferDto): Promise<OfferEntity> {
    return await this.offerService.create(createOfferDto);
  }



  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<{ items: OfferEntity[], total: number }> {
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    
    return await this.offerService.findAll(pageNumber, pageSize);

    
  }


  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<OfferEntity> {
    return await this.offerService.findOne(id);
  }



  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateOfferDto: UpdateOfferDto): Promise<OfferEntity> {
    return await this.offerService.update(id, updateOfferDto);
  }



  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Put('update/active/:id')
  async updateOfferIsActive(@Param('id') id: string ,  @Body() UpdateIsActiveDto: UpdateIsActiveDto) {
    return this.offerService.updateIsActive(id,UpdateIsActiveDto);
  }


  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return await this.offerService.remove(id);
  }
}