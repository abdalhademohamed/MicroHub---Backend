import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Response,
  Request,
  Req,
  BadRequestException,
  UseGuards,
  NotFoundException,
  Query,
} from "@nestjs/common";
import { ReceiptService } from "./receipt.service";
import { CreateReceiptDto } from "./dto/create.receipt.dto";
import { UpdateReceiptDto } from "./dto/update-receipt.dto";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/Roles.decorator";
import { Role } from "../user/utils/user.enum";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";
import { RolesGuard } from "../auth/guards/role.guards";
import { Response as ExpressResponse } from "express";
import { ReceiptEntity } from "./entities/receipt.entity";
import { CreateReceiptFromReservationIdDto } from "./dto/create.receipt.from.reservationId.dto";
import { GetReceiptsDto } from "./dto/get-receipts.dto";

@ApiTags("receipt")
@Controller("receipt")
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Get()
  async getReceipts(@Query() getReceiptsDto: GetReceiptsDto) {
    return this.receiptService.getReceipts(getReceiptsDto);
  }

  // Endpoint to create a receipt
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ARTISTMANAGER,
    Role.ADMIN,
  )
  @Post("reservation")
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  async createReceiptFromReservationId(
    @Request() Req: any, // Request object to access the user

    @Body()
    CreateReceiptFromReservationIdDto: CreateReceiptFromReservationIdDto,
  ) {
    const userId = Req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    const receipt = await this.receiptService.createReceiptFromReservationId(
      CreateReceiptFromReservationIdDto,
      userId,
    );
    return { receipt };
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ARTISTMANAGER,
    Role.ADMIN,
  )
  // Endpoint to create a receipt
  @Post()
  async createReceipt(
    @Request() Req: any, // Request object to access the user

    @Body() createReceiptDto: CreateReceiptDto,
  ) {
    const userId = Req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    const receipt = await this.receiptService.createReceipt(
      createReceiptDto,
      userId,
    );
    return { receipt };
  }
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ARTISTMANAGER,
    Role.ADMIN,
  )
  @Get(":orderId")
  async getReceiptByOrderId(
    @Param("orderId") orderId: string,
  ): Promise<ReceiptEntity> {
    return this.receiptService.getReceiptByOrderId(orderId);
  }
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ARTISTMANAGER,
    Role.ADMIN,
  )
  @Get("reservation/:reservationId")
  async getReceiptByReservationId(
    @Param("reservationId") reservationId: string,
  ): Promise<ReceiptEntity> {
    return this.receiptService.getReceiptByReservationId(reservationId);
  }

  // //  Endpoint to generate and download the receipt PDF
  // @Get('download/:id')
  // @UseGuards(AccessTokenGuard,RolesGuard)  // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  // async downloadReceipt(@Param('id') id: string, @Response() Res: any) {
  //   try {
  //     await this.receiptService.generatePdfReceipt(id, Res);
  //   } catch (error) {
  //     // Handle errors and return appropriate response
  //     Res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Failed to generate PDF receipt');
  //   }
  // }

  // // Endpoint to generate and download the receipt PDF
  // @Get('download/:id')
  // async downloadfakeReceipt(
  //   @Param('id') id: string,
  //   @Response() response: ExpressResponse
  // ) {
  //   try {
  //     await this.receiptService.generatefakePdfReceipt(id, response);
  //   } catch (error) {
  //     if (error instanceof NotFoundException) {
  //       response.status(404).send('Receipt not found');
  //     } else {
  //       response.status(500).send('Failed to generate PDF receipt');
  //     }
  //   }
  // }

  @Get("refunded/:reservationId")
  async getRefundedReceiptByReservationId(
    @Param("reservationId") reservationId: string,
  ): Promise<ReceiptEntity[]> {
    return this.receiptService.getRefundedReceiptByReservationId(reservationId);
  }
}
