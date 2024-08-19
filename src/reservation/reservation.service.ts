import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ReservationEntity } from './entities/reservation.entity';
import { BranchEntity } from '../branch/entities/branch.entity';
import { ServiceEntity } from '../service/entities/service.entity';
import { CreateReservationDto } from './dto/create.reservation.dto';
import { GetReservationsDto } from './dto/get.reservation.dto';
import { UpdateReservationDto } from './dto/update.reservation.dto';


@Injectable()
export class ReservationService {
  
  constructor(

    @InjectRepository(ReservationEntity)
    private readonly ReservationRepository: Repository<ReservationEntity>,

    @InjectRepository(BranchEntity)
    private readonly BranchRepository: Repository<BranchEntity>,

    @InjectRepository(ServiceEntity)
    private readonly ServiceRepository: Repository<ServiceEntity>,

  ) {}

  async createReservation(createReservationDto: CreateReservationDto): Promise<ReservationEntity> {
    const {
      phone_Number,
      client_FullName,
      day,
      month,
      year,
      reservation_Time_From,
      reservation_Time_To,
      branch,
      services: serviceIds,
      deposit_Content,
    } = createReservationDto;

    // Check if the branch exists
    const existingbranch = await this.BranchRepository.findOne({ where: { id :branch.id} });
    if (!existingbranch) {
      throw new NotFoundException('Branch not found');
    }

    // Retrieve and verify services
   const services = await this.ServiceRepository.find({
     where: {
       id: In(serviceIds),
     },
   });
    if (services.length !== serviceIds.length) {
      throw new NotFoundException('One or more services not found');
    }

   

    // Create the reservation
    const newReservation = this.ReservationRepository.create({
      phone_Number,
      client_FullName,
      day,
      month,
      year,
      reservation_Time_From,
      reservation_Time_To,
      branch,
      services,
      deposit_Content
    });

    try {
      // Save the reservation
      return await this.ReservationRepository.save(newReservation);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create reservation');
    }
  }



  async getAllReservations(getReservationsDto: GetReservationsDto): Promise<{
    data: ReservationEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      day,
      month,
      year,
      page = 1,
      limit = 10,
    } = getReservationsDto;

    const query = this.ReservationRepository.createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.branch', 'branch')
      .leftJoinAndSelect('reservation.services', 'services');

    // Apply filters
    if (day) {
      query.andWhere('reservation.day = :day', { day });
    }
    if (month) {
      query.andWhere('reservation.month = :month', { month });
    }
    if (year) {
      query.andWhere('reservation.year = :year', { year });
    }

    // Apply pagination
    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }


  async updateReservation(id: string, updateReservationDto: UpdateReservationDto): Promise<ReservationEntity> {
    const reservation = await this.ReservationRepository.findOne({
      where: { id },
      relations: ['branch', 'services'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    try {
      // Update the reservation details
      this.ReservationRepository.merge(reservation, updateReservationDto);
      return await this.ReservationRepository.save(reservation);
    } catch (error) {
      throw new InternalServerErrorException('Failed to update reservation');
    }
  }



  async deleteReservation(id: string): Promise<void> {
    const reservation = await this.ReservationRepository.findOne({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    // Delete the reservation
    await this.ReservationRepository.remove(reservation);
  }
}
