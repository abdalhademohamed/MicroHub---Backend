import { Controller, Get, Post, Body, Patch, Param, Delete ,Request, UseGuards, BadRequestException,
} from '@nestjs/common';
import { SharableOfferService } from './sharable-offer.service';
import { CreateSharableOfferDto } from './dto/create-sharable-offer.dto';
import { UpdateSharableOfferDto } from './dto/update-sharable-offer.dto';
import { SharableOfferEntity } from './entities/sharable-offer.entity';
import { ApiResponse, ApiTags } from '@nestjs/swagger';


@ApiTags('sharable-offer')
@Controller('sharable/offer')
export class SharableOfferController {
  constructor(private readonly sharableOfferService: SharableOfferService) {}
  // @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  @Post()
  async create(    @Request() req: any, 
  @Body() createSharableOfferDto: CreateSharableOfferDto): Promise<SharableOfferEntity> {
    // const userId = req.user.sub; // Hardcoded user ID for now

    // if (!userId) {
    //   throw new BadRequestException("User not authenticated");
    // }
    return this.sharableOfferService.createSharableOffer(createSharableOfferDto);
  }


// @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  @Get('active') // Route to get active sharable offers
  async findActiveSharableOffer(): Promise<SharableOfferEntity[]> {
    return await this.sharableOfferService.findActiveSharableOffer();
  }

  @Get('count') // GET request to /sharable-offers/count
  @ApiResponse({ status: 200, description: 'Get the count of sharable offers.' })
  async getSharableOffersCount(): Promise<{ total: number; active: number }> {
    return await this.sharableOfferService.countSharableOffers();
  }



// @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  @Get() // GET request to /sharable-offers
  async getAllSharableOffers(): Promise<SharableOfferEntity[]> {
    return await this.sharableOfferService.findAllSharableOffers();
  }





  
}
