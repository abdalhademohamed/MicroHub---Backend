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

@ApiTags("reservation")
@Controller("reservation")
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}
  // @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  @Post()
  @UseInterceptors(FileInterceptor("image")) // Intercept the file upload
  async createReservations(
    @Body() CreateCustomerDto: CreateReservationDto, // Array of customer DTOs
    @UploadedFile() image: Express.Multer.File, // Handle the uploaded file
  ): Promise<any> {
    try {
      // Call the service to create reservations
      return await this.reservationService.createReservation(
        CreateCustomerDto,
        image,
      );
    } catch (error) {
      // Handle errors appropriately
      throw new BadRequestException(error.message);
    }
  }

  @Get('booking/:branchId')
  async getAllBookings(
    @Param('branchId') branchId: string,
    @Query() getReservationsDto: GetReservationsDto,
  ) {
    return this.reservationService.getBookingBranch(branchId, getReservationsDto);
  }

  // @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  @Get()
  async getAllReservations(
    @Query() getReservationsDto: GetReservationsDto,
  ): Promise<{
    items: ReservationEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { branchId, ...filterDto } = getReservationsDto;
    return this.reservationService.getAllReservations(filterDto, branchId);
  }

  // @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  // Update a reservation by ID
  @Post("customer")
  async createCustomer(
    @Body() body: CreateCustomerDto,
  ){
    return this.reservationService.registerOrLookupCustomer(body);
  }
  @Put(":id")
  async updateReservationServices(
    @Param("id") id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ){
    return this.reservationService.updateReservationServices(id, updateReservationDto);
  }

  @Put("time/:id")
  async updateReservationStartTime(
    @Param("id") id: string,
    @Body() updateReservationDto: UpdateTimeReservationDto,
  ){
    return this.reservationService.updateTime(id, updateReservationDto);
  }


  @Delete(":id")
  async deleteReservation(@Param("id") id: string){
    return this.reservationService.deleteReservation(id);
  }
}
