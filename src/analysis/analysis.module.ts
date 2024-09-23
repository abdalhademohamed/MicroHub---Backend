import { Module } from "@nestjs/common";
import { AnalysisService } from "./analysis.service";
import { AnalysisController } from "./analysis.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentEntity } from "../payment/entities/payment.entity";
import { ReservationEntity } from "../reservation/entities/reservation.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ReservationEntity, PaymentEntity])],
  controllers: [AnalysisController],
  providers: [AnalysisService],
})
export class AnalysisModule {}
