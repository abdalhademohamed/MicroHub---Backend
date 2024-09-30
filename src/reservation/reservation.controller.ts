import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Put,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
  Req,
} from "@nestjs/common";
import { ReservationService } from "./reservation.service";
import { UpdateReservationDto } from "./dto/update.reservation.dto";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ReservationEntity } from "./entities/reservation.entity";
import { GetReservationsDto } from "./dto/get.reservation.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { CreateReservationDto } from "./dto/create.reservation.dto";
import { UpdateTimeReservationDto } from "./dto/update-time.reservation.dto";
import { CreateCustomerDto } from "../customer/dto/create.customer.dto";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";
import { RolesGuard } from "../auth/guards/role.guards";
import { Role } from "../user/utils/user.enum";
import { Roles } from "../auth/Roles.decorator";

@ApiTags("reservation")
@Controller("reservation")
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

 
  @Get('top5')
  async getTop5Reservations(
    @Query('fromDate') startDate: string,
    @Query('toDate') endDate: string,
  ): Promise<ReservationEntity[]> {
    return this.reservationService.getTop5Reservations(startDate, endDate);
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.COORDINATOR)
  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @UseInterceptors(FileInterceptor("deposit_Content")) // Intercept the file upload
  async createReservations(
    @Req() req: any, // Request object to access the user

    @Body() CreateCustomerDto: CreateReservationDto, // Array of customer DTOs
    @UploadedFile() image: Express.Multer.File // Handle the uploaded file
  ): Promise<any> {
    try {
      // Call the service to create reservations
      // console.log("data:",CreateCustomerDto)
      const userId = req.user.sub; // Extract user ID from request

      if (!userId) {
        throw new BadRequestException("User not authenticated");
      }
      return await this.reservationService.createReservation(
        CreateCustomerDto,
        image,
        userId
      );
    } catch (error) {
      // Handle errors appropriately
      throw new BadRequestException(error.message);
    }
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @Get("booking/:branchId")
  async getAllBookings(
    @Param("branchId") branchId: string,
    @Query() getReservationsDto: GetReservationsDto
  ) {
    return this.reservationService.getBookingBranch(
      branchId,
      getReservationsDto
    );
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  @Get()
  async getAllReservations(
    @Req() req: any, // Request object to access the user

    @Query() getReservationsDto: GetReservationsDto
  ): Promise<{
    items: ReservationEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { branchId, ...filterDto } = getReservationsDto;
    return this.reservationService.getAllReservations(filterDto, branchId);
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  // Update a reservation by ID
  @Post("customer")
  async createCustomer(@Body() body: CreateCustomerDto) {
    return this.reservationService.registerOrLookupCustomer(body);
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.COORDINATOR)
  @Put(":id")
  async updateReservationServices(
    @Req() req: any, // Request object to access the user

    @Param("id") id: string,
    @Body() updateReservationDto: UpdateReservationDto
  ) {
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return this.reservationService.updateReservationServices(
      id,
      updateReservationDto,
      userId
    );
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @Put("time/:id")
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.COORDINATOR)
  async updateReservationStartTime(
    @Req() req: any, // Request object to access the user
    @Param("id") id: string,
    @Body() updateReservationDto: UpdateTimeReservationDto
  ) {
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return this.reservationService.updateTime(id, updateReservationDto, userId);
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @Delete(":id")
  async deleteReservation(@Param("id") id: string) {
    return this.reservationService.deleteReservation(id);
  }
}
