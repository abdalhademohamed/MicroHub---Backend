import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create.reservation.dto';
import { UpdateReservationDto } from './dto/update.reservation.dto';
import { ApiTags } from '@nestjs/swagger';
import { ReservationEntity } from './entities/reservation.entity';
import { GetReservationsDto } from './dto/get.reservation.dto';

@ApiTags('reservation')
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  // Create a new reservation
  @Post()
  async createReservation(
    @Body() createReservationDto: CreateReservationDto,
  ): Promise<ReservationEntity> {
    return this.reservationService.createReservation(createReservationDto);
  }

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

  // Update a reservation by ID
  @Patch(':id')
  async updateReservation(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ): Promise<ReservationEntity> {
    return this.reservationService.updateReservation(id, updateReservationDto);
  }

  // Delete a reservation by ID
  @Delete(':id')
  async deleteReservation(@Param('id') id: string): Promise<void> {
    return this.reservationService.deleteReservation(id);
  }
}