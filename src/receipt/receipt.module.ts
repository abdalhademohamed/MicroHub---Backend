import { Module } from "@nestjs/common";
import { ReceiptService } from "./receipt.service";
import { ReceiptController } from "./receipt.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReceiptEntity } from "./entities/receipt.entity";
import { OrderEntity } from "../orders/entities/order.entity";
import { UserEntity } from "../user/entities/user.entity";
import { ServiceEntity } from "../service/entities/service.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { OfferEntity } from "../offer/entities/offer.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReceiptEntity,
      OrderEntity,
      UserEntity,
      ServiceEntity,
      AuditLogEntity,
      OfferEntity
    ]),
  ],
  controllers: [ReceiptController],
  providers: [ReceiptService],
})
export class ReceiptModule {}
