import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Query } from '@nestjs/common';
import { OfferService } from './offer.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { ApiTags } from '@nestjs/swagger';
import { OfferEntity } from './entities/offer.entity';



@ApiTags('offer')
@Controller('offer')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Post()
  async create(@Body() createOfferDto: CreateOfferDto): Promise<OfferEntity> {
    return await this.offerService.create(createOfferDto);
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<{ items: OfferEntity[], total: number }> {
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    
    return await this.offerService.findAll(pageNumber, pageSize);

    
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<OfferEntity> {
    return await this.offerService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateOfferDto: UpdateOfferDto): Promise<OfferEntity> {
    return await this.offerService.update(id, updateOfferDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return await this.offerService.remove(id);
  }
}