import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  Query,
  BadRequestException,
  Put,
  HttpStatus,
  Request,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";
import { RolesGuard } from "../auth/guards/role.guards";
import { Roles } from "../auth/Roles.decorator";
import { Role } from "../user/utils/user.enum";
import { OrderEntity } from "./entities/order.entity";
import { FindOrdersDto } from "./dto/find.all.orders.dto";
import { OrderStatus } from "./utils/order.status.enum";
import { FindOrdersByDayDto } from "./dto/find.orders.dto.for.artist";

@ApiTags("orders")
@Controller("order")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // @Post(':reservationId')
  // @ApiOperation({ summary: 'Create an order from a reservation' })
  // @ApiResponse({ status: 201, description: 'Order created successfully.' })
  // @ApiResponse({ status: 404, description: 'Reservation not found.' })
  // async createOrder(
  //   @Param('reservationId') reservationId: string
  // ) {
  //   return this.ordersService.createOrder(reservationId);
  // }

  // Endpoint to update the order status
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  @Patch("payment/status/:orderId")
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.COORDINATOR,Role.BRANCHMANAGER,Role.RECEPTIONIST)
  @UseInterceptors(FileInterceptor("image")) // Use multer for image upload
  @ApiOperation({ summary: "Update the payment status of an order" })
  @ApiResponse({
    status: 200,
    description: "Payment status successfully updated",
    type: OrderEntity, // You might want to use a response DTO here if you have one
  })
  @ApiResponse({
    status: 404,
    description: "Order not found",
  })
  @ApiResponse({
    status: 500,
    description: "Internal server error",
  })
  async updateOrderPaymentStatus(
    @Request() req: any, // Request object to access the user
    @Param("orderId") orderId: string,
    @Body("paymentStatus") paymentStatus: "paid" | "partially paid",
    @UploadedFile() image: Express.Multer.File, // File uploads cannot be passed as query parameters
  ) {
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return await this.ordersService.updatePaymentStatus(
      orderId,
      paymentStatus,
      image,
      userId,
    );
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @Patch("status/:orderId")
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.COORDINATOR,Role.RECEPTIONIST,Role.ARTIST)
  @UseInterceptors(FileInterceptor("image")) // Use multer for image upload
  async updateOrderStatus(
    @Request() req: any, // Request object to access the user
    @Param("orderId") orderId: string,
    @Body("OrderStatus") status: OrderStatus,
    @UploadedFile() image: Express.Multer.File, // File uploads cannot be passed as query parameters
  ) {
    if (!Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException("Invalid status");
    }

    try {
      const userId = req.user.sub; // Extract user ID from request

      if (!userId) {
        throw new BadRequestException("User not authenticated");
      }
      return await this.ordersService.updateOrderStatus(
        orderId,
        status,
        image,
        userId,
      );
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Failed to update order status",
      };
    }
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @Patch('assign')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.COORDINATOR,Role.RECEPTIONIST)
  async assignOrderToArtist(
    @Request() req: any, // Request object to access the user
    @Query('orderId') orderId: string,
    @Query('artistId') artistId: string,
  ): Promise<OrderEntity> {
    console.log('Received orderId:', orderId);
    console.log('Received artistId:', artistId); 

    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    if (!orderId || !artistId) {
      throw new BadRequestException('Both orderId and artistId are required');
    }
    return this.ordersService.assignOrderToArtist(orderId, artistId, userId);
  }
 
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  @Get("sorted")
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.RECEPTIONIST,Role.COORDINATOR)
  @ApiOperation({
    summary: "Get all orders with pagination, sorting, and filtering",
  })
  @ApiResponse({ status: 200, description: "Orders retrieved successfully." })
  @ApiResponse({ status: 500, description: "Internal server error." })
  async getAllOrders(
    @Query() findOrdersDto: FindOrdersDto,
  ): Promise<{ items: OrderEntity[]; total: number }> {
    return await this.ordersService.findAllOrders(findOrdersDto);
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  @Get("status/count/:branchId")
  @ApiOperation({
    summary: "Get count of orders by status for a specific branch",
  })
  @ApiResponse({
    status: 200,
    description:
      "Return the count of each order status for the specified branch",
    schema: {
      example: {
        items: {
          InProgress: 10,
          InQueue: 5,
          Working: 8,
          Done: 12,
          Completed: 20,
          Canceled: 3,
        },
      },
    },
  })
  async getOrderStatusCount(
    @Param("branchId") branchId: string,
  ): Promise<{ items: { [key in OrderStatus]: number } }> {
    return await this.ordersService.getOrderStatusCount(branchId);
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  @Get("filterd")
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ARTIST)

  async getOrdersForEmployee(
    @Request() req: any, // Request object to access the user
    @Query() findOrdersByDayDto: FindOrdersByDayDto,
  ) {
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return this.ordersService.findOrdersByEmployeeAndDay(
      userId,
      findOrdersByDayDto,
    );
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @Get("/:orderId")
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.RECEPTIONIST)
  async getOrderById(@Param("orderId") orderId: string) {
    try {
      const order = await this.ordersService.findOrderById(orderId);
      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }
      return order;
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to retrieve the order",
        error.stack,
      );
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  @Put("payment/:orderId")
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.COORDINATOR)
  @ApiOperation({ summary: "Update the payment for a specific order" })
  @ApiParam({
    name: "orderId",
    description: "The ID of the order to update",
    type: String,
  })
  @ApiQuery({
    name: "paymentId",
    description: "The ID of the payment to associate with the order",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "The order with the updated payment",
    type: OrderEntity, // Update this to match your response DTO if you have one
  })
  @ApiResponse({
    status: 404,
    description: "Order or payment not found",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid input",
  })
  async updatePayment(
    @Param("orderId") orderId: string,
    @Query("paymentId") paymentId: string,
  ) {
    if (!orderId || !paymentId) {
      throw new BadRequestException("Order ID and Payment ID must be provided");
    }
    return this.ordersService.updatePaymentForOrder(orderId, paymentId);
  }


  @ApiOperation({ summary: 'Get top 5 artists based on orders' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @Get('top/artists')
  async getTopArtists(
    @Query('branchId') branchId?: string,
  ) {
     // Fetch the top 5 artists by orders, filtered by branch if provided
     const topArtists = await this.ordersService.getTopArtistsByOrders(branchId);

     // Check if any artists were found
     if (!topArtists || topArtists.length === 0) {
       throw new NotFoundException('No top artists found');
     }

     return topArtists 
  }
}
