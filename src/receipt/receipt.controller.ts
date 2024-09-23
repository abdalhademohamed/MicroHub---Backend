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

@ApiTags("receipt")
@Controller("receipt")
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  // Endpoint to create a receipt
  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  async createReceipt(
    @Request() Req: any, // Request object to access the user

    @Body() createReceiptDto: CreateReceiptDto,
  ) {
    try {
      const userId = Req.user.sub; // Extract user ID from request

      if (!userId) {
        throw new BadRequestException("User not authenticated");
      }
      const receipt = await this.receiptService.createReceipt(
        createReceiptDto,
        userId,
      );
      return { receipt };
    } catch (error) {
      // Handle errors and return appropriate response
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Failed to create receipt",
      };
    }
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
}
