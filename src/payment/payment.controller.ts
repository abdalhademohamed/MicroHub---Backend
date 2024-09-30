import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  Put,
  UseGuards,
} from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { CreatePaymentDto } from "./dto/create.payment.dto";
import { UpdatePaymentDto } from "./dto/update.payment.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { PaymentEntity } from "./entities/payment.entity";
import { Roles } from "../auth/Roles.decorator";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";
import { RolesGuard } from "../auth/guards/role.guards";
import { Role } from "../user/utils/user.enum";

@Controller("payment")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @UseInterceptors(FileInterceptor("image"))
  @Post()
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @UploadedFile() image: Express.Multer.File, // Handle the uploaded file
  ) {
    return this.paymentService.createPayment(createPaymentDto, image);
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN,Role.COORDINATOR)
  @Get()
  async getAllPayments(): Promise<PaymentEntity[]> {
    return this.paymentService.getAllPayments();
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN,Role.COORDINATOR)
  @Get(":id")
  async getPaymentById(@Param("id") id: string): Promise<PaymentEntity> {
    return this.paymentService.getPaymentById(id);
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Put(":id")
  @UseInterceptors(FileInterceptor("image"))
  async updatePayment(
    @Param("id") id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<PaymentEntity> {
    // Handle file upload and update the image path or URL in the DTO
    if (file) {
      updatePaymentDto.image = file.path; // Or use a URL if using a cloud service
    }
    return this.paymentService.updatePayment(id, updatePaymentDto);
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Delete(":id")
  async removePayment(@Param("id") id: string): Promise<void> {
    return this.paymentService.removePayment(id);
  }
}
