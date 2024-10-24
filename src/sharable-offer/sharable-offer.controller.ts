import { Controller, Get, Post, Body, Patch, Param, Delete ,Request, UseGuards, BadRequestException, Put,
} from '@nestjs/common';
import { SharableOfferService } from './sharable-offer.service';
import { CreateSharableOfferDto } from './dto/create-sharable-offer.dto';
import { UpdateSharableOfferDto } from './dto/update-sharable-offer.dto';
import { SharableOfferEntity } from './entities/sharable-offer.entity';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { RolesGuard } from '../auth/guards/role.guards';
import { Roles } from '../auth/Roles.decorator';
import { Role } from '../user/utils/user.enum';


@ApiTags('sharable-offer')
@Controller('sharable/offer')
export class SharableOfferController {
  constructor(private readonly sharableOfferService: SharableOfferService) {}

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Put(":sharableOfferId")
  async update(
    @Request() req: any, // Request object to access the user
    @Param("sharableOfferId") sharableOfferId: string,
    @Body() UpdateSharableOfferDto: UpdateSharableOfferDto,
  ): Promise<SharableOfferEntity> {
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return await this.sharableOfferService.update(sharableOfferId, UpdateSharableOfferDto, userId);
  }

  // @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  @Put("update/active/:id")
  async updateOfferIsActive(
    @Param("id") id: string,
    @Body('isActive') isActive: boolean, // Get the isActive value from the request body
  ) {
    return this.sharableOfferService.updateIsActive(id, isActive);
  }
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


@UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN,Role.ACCOUNTANT)
  @Get('active') // Route to get active sharable offers
  async findActiveSharableOffer(): Promise<SharableOfferEntity[]> {
    return await this.sharableOfferService.findActiveSharableOffer();
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN,Role.ACCOUNTANT)
  @Get('count') // GET request to /sharable-offers/count
  @ApiResponse({ status: 200, description: 'Get the count of sharable offers.' })
  async getSharableOffersCount(): Promise<{ total: number; active: number }> {
    return await this.sharableOfferService.countSharableOffers();
  }



@UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN,Role.ACCOUNTANT)
  @Get() // GET request to /sharable-offers
  async getAllSharableOffers(): Promise<SharableOfferEntity[]> {
    return await this.sharableOfferService.findAllSharableOffers();
  }





  
}
