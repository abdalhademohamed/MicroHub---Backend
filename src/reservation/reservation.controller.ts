import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, BadRequestException, Put, UseGuards } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create.reservation.dto';
import { UpdateReservationDto } from './dto/update.reservation.dto';
import { ApiTags } from '@nestjs/swagger';
import { ReservationEntity } from './entities/reservation.entity';
import { GetReservationsDto } from './dto/get.reservation.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Roles } from 'src/auth/Roles.decorator';
import { Role } from 'src/user/utils/user.enum';
import { AccessTokenGuard } from 'src/auth/guards/accessToken.guard';
import { RolesGuard } from 'src/auth/guards/role.guards';

@ApiTags('reservation')
@Controller('reservation')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService,
    private readonly CloudinaryService: CloudinaryService

  ) {}


  // @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  // // Create a new reservation
  // @Post()
  // async createReservation(
  //   @Body() createReservationDto: CreateReservationDto,
  // ): Promise<ReservationEntity> {
  //   return this.reservationService.createReservation(createReservationDto);
  // }


  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  // Get all reservations with pagination and filtering
  @Get()
  async getAllReservations(
    @Query() GetReservationsDto: GetReservationsDto,
  ): Promise<{
    data: ReservationEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.reservationService.getAllReservations(GetReservationsDto);
  }


  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  // Update a reservation by ID
  @Put(':id')
  async updateReservation(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ): Promise<ReservationEntity> {
    return this.reservationService.updateReservation(id, updateReservationDto);
  }


  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  // Delete a reservation by ID
  @Delete(':id')
  async deleteReservation(@Param('id') id: string): Promise<void> {
    return this.reservationService.deleteReservation(id);
  }



  // @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  // @Post('upload/:reservationId')
  // @UseInterceptors(FileInterceptor('image'))
  // async uploadImage(
  //   @Param('reservationId') reservationId: string,
  //   @UploadedFile() image: Express.Multer.File,
    
  // ): Promise<{ imageUrl: string }> {
  //   const folderName = 'reservations'; // or any other dynamic name based on context

  //   return this.reservationService.uploadImageAndAssociateWithReservation(reservationId, image,folderName);
  // }
  

}