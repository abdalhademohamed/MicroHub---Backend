import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { OrderEntity } from './entities/order.entity';
import { Repository } from 'typeorm';
import { ReservationEntity } from '../reservation/entities/reservation.entity';

import { EmployeeEntity } from '../employee/entities/employee.entity';
import { FindOrdersDto } from './dto/find.all.orders.dto';
import { OrderStatus } from './utils/order.status.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,

    @InjectRepository(ReservationEntity)
    private readonly reservationRepository: Repository<ReservationEntity>,

    

    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>

  ) {}

  async createOrder(reservationId: string): Promise<OrderEntity> {
     // Fetch reservation with related services
  const reservation = await this.reservationRepository.findOne({
    where: { id: reservationId },
    relations: ['services', 'customer'],
  });
  

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    const newOrder = this.orderRepository.create({
      customerName: reservation.customer.fullName,
      date: `${reservation.reservationYear}-${reservation.reservationMonth}-${reservation.reservationDay}`,
      service: reservation.services.map(service => service.english_Name).join(', '),
      status: OrderStatus.Completed,
      invoiceNumber: +1,
      comments:[],
      reservation,
      artist: null // Initialize artist with null 
    });

    try {
      return await this.orderRepository.save(newOrder);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create order', error.stack);
    }
  }



   // Method to update the status of an order
   async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<OrderEntity> {
    // Find the order
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Update the status
    order.status = newStatus;

    try {
      return await this.orderRepository.save(order);
    } catch (error) {
      throw new InternalServerErrorException('Failed to update order status', error.stack);
    }
  }



  async assignOrderToArtist(
    orderId: string,
    artistId: string
  ): Promise<OrderEntity> {
    let order: OrderEntity;
    let artist: EmployeeEntity;

    try {
      // Find the order
      order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // Find the artist
      artist = await this.employeeRepository.findOne({
        where: { id: artistId },
        relations: ['employeeType'], // Ensure employeeType is included
      });

      if (!artist) {
        throw new NotFoundException(`Artist with ID ${artistId} not found`);
      }

      // Check if the employee is an artist
      if (artist.employeeType.typeEnglish !== 'Artist') {
        throw new NotFoundException(`Employee with ID ${artistId} is not an artist`);
      }

      // Assign the order to the artist
      order.artist = artist;

      // Save the updated order
      return await this.orderRepository.save(order);

    } catch (error) {
      throw new InternalServerErrorException('Failed to assign order to artist', error.stack);
    }
  }



  async findAllOrders(findOrdersDto: FindOrdersDto): Promise<{ orders: OrderEntity[]; total: number }> {
    const { page, limit, sort, employeeName } = findOrdersDto;

    try {
      const query = this.orderRepository.createQueryBuilder('order')
        .leftJoinAndSelect('order.artist', 'artist') // Join artist to filter by name
        .take(limit)
        .skip((page - 1) * limit)
        .orderBy('order.date', sort.toUpperCase() as 'ASC' | 'DESC');

      if (employeeName) {
        query.andWhere('artist.englishName ILIKE :employeeName', { employeeName: `%${employeeName}%` });
      }

      const [orders, total] = await query.getManyAndCount();

      return { orders, total };

    } catch (error) {
      throw new InternalServerErrorException('Failed to get orders', error.stack);
    }
  }

}