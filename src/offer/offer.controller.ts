import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { OfferService } from "./offer.service";
import { CreateOfferDto } from "./dto/create.offer.dto";
import { UpdateOfferDto } from "./dto/update.offer.dto";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { OfferEntity } from "./entities/offer.entity";
import { UpdateIsActiveDto } from "./dto/update.active.dto";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";
import { RolesGuard } from "../auth/guards/role.guards";
import { Role } from "../user/utils/user.enum";
import { Roles } from "../auth/Roles.decorator";

@ApiTags("offer")
@Controller("offer")
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @Post()
  async create(
    @Request() req: any, // Request object to access the user

    @Body() createOfferDto: CreateOfferDto,
  ): Promise<OfferEntity> {
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return await this.offerService.create(createOfferDto, userId);
  }
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.ACCOUNTANT, Role.ADMIN)
  @Get("count") // GET request to /sharable-offers/count
  @ApiResponse({
    status: 200,
    description: "Get the count of sharable offers.",
  })
  async getSharableOffersCount(): Promise<{ total: number; active: number }> {
    return await this.offerService.countOffers();
  }
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ARTISTMANAGER,
    Role.ACCOUNTANT,
    Role.ADMIN
  )
  @Get("active") // Route to get active sharable offers
  async findActiveSharableOffer(
    @Query("branchId") branchId?: string, // Accept branchId as an optional query parameter
  ): Promise<OfferEntity[]> {
    return this.offerService.findActiveOffers(branchId);
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ARTISTMANAGER,
    Role.ACCOUNTANT,
    Role.ADMIN
  )
  @Get()
  async findAll(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
  ): Promise<{ items: OfferEntity[]; total: number }> {
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);

    return await this.offerService.findAll(pageNumber, pageSize);
  }
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.COORDINATOR, Role.RECEPTIONIST, Role.ACCOUNTANT, Role.ADMIN)
  @Get(":id")
  async findOne(@Param("id") id: string): Promise<OfferEntity> {
    return await this.offerService.findOne(id);
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.ACCOUNTANT, Role.ADMIN)
  @Put(":offerId")
  async update(
    @Request() req: any, // Request object to access the user
    @Param("offerId") offerId: string,
    @Body() updateOfferDto: UpdateOfferDto,
  ): Promise<OfferEntity> {
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return await this.offerService.update(offerId, updateOfferDto, userId);
  }
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @Put("update/active/:id")
  async updateOfferIsActive(
    @Param("id") id: string,
    @Body() UpdateIsActiveDto: UpdateIsActiveDto,
  ) {
    return this.offerService.updateIsActive(id, UpdateIsActiveDto);
  }
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @Delete(":offerId")
  async remove(
    @Request() req: any, // Request object to access the user
    @Param("offerId") offerId: string,
  ): Promise<void> {
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return await this.offerService.remove(offerId, userId);
  }
}
