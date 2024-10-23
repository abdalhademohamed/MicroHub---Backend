import { Module } from "@nestjs/common";
import { CustomerService } from "./customer.service";
import { CustomerController } from "./customer.controller";
import { CustomerEntity } from "./entities/customer.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReservationEntity } from "src/reservation/entities/reservation.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CustomerEntity,ReservationEntity])],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
