import { Module } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { PaymentController } from "./payment.controller";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { PaymentEntity } from "./entities/payment.entity";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity])],
  controllers: [PaymentController],
  providers: [PaymentService, CloudinaryService],
})
export class PaymentModule {}
