import { Module } from "@nestjs/common";
import { AnalysisService } from "./analysis.service";
import { AnalysisController } from "./analysis.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentEntity } from "../payment/entities/payment.entity";
import { ReservationEntity } from "../reservation/entities/reservation.entity";
import { BranchEntity } from "../branch/entities/branch.entity";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { CustomerEntity } from "../customer/entities/customer.entity";
import { ServiceEntity } from "../service/entities/service.entity";
import { OfferEntity } from "../offer/entities/offer.entity";
import { SharableOfferEntity } from "../sharable-offer/entities/sharable-offer.entity";
import { OrderedBulkOperation } from "typeorm";
import { OrderEntity } from "../orders/entities/order.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ReservationEntity, PaymentEntity,BranchEntity,EmployeeEntity,CustomerEntity,ServiceEntity,OfferEntity,SharableOfferEntity,OrderEntity])],
  controllers: [AnalysisController],
  providers: [AnalysisService],
})
export class AnalysisModule {}
