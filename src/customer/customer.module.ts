import { Module } from "@nestjs/common";
import { CustomerService } from "./customer.service";
import { CustomerController } from "./customer.controller";
import { CustomerEntity } from "./entities/customer.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReservationEntity } from "../reservation/entities/reservation.entity";
import { CustomI18nService } from "../common/custom.18n.service";
import { OrderEntity } from "src/orders/entities/order.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CustomerEntity,ReservationEntity, OrderEntity])],
  controllers: [CustomerController],
  providers: [
    CustomerService,
    CustomI18nService,
  ],
})
export class CustomerModule {}
