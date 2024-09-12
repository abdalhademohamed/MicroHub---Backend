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

  // @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  // Get all reservations with pagination and filtering
  @Get()
  @ApiOperation({ summary: "Retrieve all reservations with optional filters" })
  @ApiResponse({
    status: 200,
    description: "List of reservations",
    type: [ReservationEntity],
  })
  @ApiResponse({ status: 404, description: "No reservations found" })
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
  @Put(":id")
  async updateReservation(
    @Param("id") id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ): Promise<ReservationEntity> {
    return this.reservationService.updateReservation(id, updateReservationDto);
  }

  // @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  // Delete a reservation by ID
  @Delete(":id")
  async deleteReservation(@Param("id") id: string): Promise<void> {
    return this.reservationService.deleteReservation(id);
  }
}
