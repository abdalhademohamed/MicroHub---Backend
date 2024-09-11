import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, BadRequestException, Put, UseGuards } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create.reservation.dto';
import { UpdateReservationDto } from './dto/update.reservation.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReservationEntity } from './entities/reservation.entity';
import { GetReservationsDto } from './dto/get.reservation.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Roles } from '../auth/Roles.decorator';
import { Role } from '../user/utils/user.enum';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { RolesGuard } from '../auth/guards/role.guards';
import { CreateCustomerDto } from '../customer/dto/create.customer.dto';

@ApiTags('reservation')
@Controller('reservation')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService,
    private readonly CloudinaryService: CloudinaryService

  ) {}

 
 
  // @Post(':branchId')
  // async createReservation(
  //   @Body()   createCustomerDto: CreateCustomerDto,
  //   @Param('branchId') branchId: string,
  //   @Query('servicesIds') serviceIds: string |string[]
  //   , // Accept string or array

  // ): Promise<{ reservation: ReservationEntity; receipt: string }> {
   
  //  // Convert servicesIds to array
  //   let servicesIdsArray: string[];

  //   if (Array.isArray(serviceIds)) {
  //     servicesIdsArray = serviceIds;
  //   } else if (typeof serviceIds === 'string') {
  //     servicesIdsArray = serviceIds.split(',').map(id => id.trim());
  //   } else {
  //     throw new BadRequestException('Invalid servicesIds format');
  //   }
  //   try {
  //     // Create reservation using the service
  //     const result = await this.reservationService.createReservation(
  //       branchId,
  //       createCustomerDto,
  //       servicesIdsArray
  //     );
  //     return result;
  //   } catch (error) {
  //     // Handle errors appropriately
  //     throw new BadRequestException(error.message);
  //   }
  // }

  // @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  // @Post(':branchId')
  // @UseInterceptors(FileInterceptor('image')) // Intercept the file upload
  // async createReservations(
  //   @Body() CreateCustomerDto: CreateCustomerDto,  // Array of customer DTOs
  //   @Param('branchId') branchId: string,
  //   @Query('servicesIds') serviceIds: string | string[],
  //   @UploadedFile() image: Express.Multer.File, // Handle the uploaded file
  // ): Promise<any> {
   
  //   // Convert servicesIds to array
  //   let servicesIdsArray: string[];
  //   if (Array.isArray(serviceIds)) {
  //     servicesIdsArray = serviceIds;
  //   } else if (typeof serviceIds === 'string') {
  //     servicesIdsArray = serviceIds.split(',').map(id => id.trim());
  //   } else {
  //     throw new BadRequestException('Invalid servicesIds format');
  //   }

  //   try {
  //     // Call the service to create reservations
  //     return  await this.reservationService.createReservation(
  //             branchId,
  //             CreateCustomerDto,
  //             servicesIdsArray,
  //             image
  //           );
  //   } catch (error) {
  //     // Handle errors appropriately
  //     throw new BadRequestException(error.message);
  //   }
  // }

  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  // Get all reservations with pagination and filtering
  @Get()
  @ApiOperation({ summary: 'Retrieve all reservations with optional filters' })
  @ApiResponse({ status: 200, description: 'List of reservations', type: [ReservationEntity] })
  @ApiResponse({ status: 404, description: 'No reservations found' })
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


  @Get('suggest/:branchId')
  @ApiOperation({ summary: 'Suggest available reservation times' })
  @ApiResponse({ status: 200, description: 'Returns a list of suggested reservation times.' })
  async suggestReservationTimes(
    @Param('branchId') branchId: string,
    @Query('servicesIds') servicesIds: string // Expecting a comma-separated string
  ) {
    const serviceIds = servicesIds ? servicesIds.split(',') : []; // Split by comma to create an array
    return this.reservationService.suggestReservationTimes(branchId, serviceIds);
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