import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UseGuards, UploadedFile, Query, BadRequestException, Put, HttpStatus } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { RolesGuard } from '../auth/guards/role.guards';
import { Roles } from '../auth/Roles.decorator';
import { Role } from '../user/utils/user.enum';
import { OrderEntity } from './entities/order.entity';
import { FindOrdersDto } from './dto/find.all.orders.dto';
import { OrderStatus } from './utils/order.status.enum';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post(':reservationId')
  @ApiOperation({ summary: 'Create an order from a reservation' })
  @ApiResponse({ status: 201, description: 'Order created successfully.' })
  @ApiResponse({ status: 404, description: 'Reservation not found.' })
  async createOrder(
    @Param('reservationId') reservationId: string
  ) {
    return this.ordersService.createOrder(reservationId);
  }

 // Endpoint to update the order status
 @Patch('status/:id')
 @UseGuards(AccessTokenGuard, RolesGuard)
 @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER)
 async updateOrderStatus(
   @Param('id') id: string,
   @Body('status') status: OrderStatus
 ) {
   if (!Object.values(OrderStatus).includes(status)) {
     throw new BadRequestException('Invalid status');
   }

   try {
     const updatedOrder = await this.ordersService.updateOrderStatus(id, status);
     return { statusCode: HttpStatus.OK, data: updatedOrder };
   } catch (error) {
     return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Failed to update order status' };
   }
 }


  @Put('assign')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER)
  @ApiOperation({ summary: 'Assign an order to an artist' })
  @ApiResponse({ status: 200, description: 'Order assigned successfully.', type: OrderEntity })
  @ApiResponse({ status: 400, description: 'Bad request, orderId or artistId is missing.' })
  @ApiResponse({ status: 404, description: 'Order or artist not found, or artist is not an artist.' })
  async assignOrderToArtist(
    @Param('orderId') orderId: string,
    @Param('artistId') artistId: string
  ): Promise<OrderEntity> {
    if (!orderId || !artistId) {
      throw new BadRequestException('Both orderId and artistId are required');
    }
    return this.ordersService.assignOrderToArtist(orderId, artistId);
  }



  @Get('sorted')
  @ApiOperation({ summary: 'Get all orders with pagination, sorting, and filtering' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getAllOrders(
    @Query() findOrdersDto: FindOrdersDto
  ): Promise<{ orders: OrderEntity[]; total: number }> {
    return this.ordersService.findAllOrders(findOrdersDto);
  }
}
