import { Module } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { PaymentController } from "./payment.controller";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { PaymentEntity } from "./entities/payment.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomI18nService } from "../common/custom.18n.service";

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity])],
  controllers: [PaymentController],
  providers: [PaymentService, CloudinaryService, CustomI18nService],
  exports: [PaymentService],
})
export class PaymentModule {}
