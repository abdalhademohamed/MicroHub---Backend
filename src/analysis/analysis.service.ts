import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { And, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { ReservationEntity } from "../reservation/entities/reservation.entity";
import { PaymentEntity } from "../payment/entities/payment.entity";
import { AnalysisDto } from "./dto/deposit.dto";

@Injectable()
export class AnalysisService {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly ReservationRepository: Repository<ReservationEntity>,
    @InjectRepository(PaymentEntity)
    private readonly PaymentRepository: Repository<PaymentEntity>,
  ) {}
  async getTotalDeposit({ start_Time, end_Time, branch }: AnalysisDto) {
    if (!start_Time || !end_Time) {
      start_Time = new Date();
      end_Time = new Date(Date.now() - 24 * 3600 * 1000);
    }
    let queryOpts = {
      createdAt: And(MoreThanOrEqual(start_Time), LessThanOrEqual(end_Time)),
    };
    if (branch) {
      queryOpts["branch"] = { id: branch };
    }
    const sum = await this.ReservationRepository.sum("deposit", queryOpts);
    return sum || 0;
  }
  async getRemainingAmount(start_Time: Date, end_Time: Date) {
    if (!start_Time || !end_Time) {
      start_Time = new Date();
      end_Time = new Date(Date.now() - 24 * 3600 * 1000);
    }

    // Build the query
    const queryBuilder = this.ReservationRepository.createQueryBuilder(
      "reservation",
    )
      .select(
        "SUM(reservation.totalPrice - reservation.deposit)",
        "remainingAmount",
      )
      .where("reservation.start_Time >= :start_Time", { start_Time })
      .andWhere("reservation.start_Time <= :end_Time", { end_Time });

    // Add branch filter if provided
    //   if (branch) {
    //     queryBuilder.andWhere('reservation.branchId = :branchId', { branchId });
    //   }

    // Execute the query and get the result
    const result = await queryBuilder.getRawOne();

    // Return the calculated remaining amount or 0 if none found
    return parseFloat(result.remainingAmount || "0");
  }
  async getTotalTransactions(start_Time: Date, end_Time: Date) {
    if (!start_Time || !end_Time) {
      start_Time = new Date();
      end_Time = new Date(Date.now() - 24 * 3600 * 1000);
    }
    const results = await this.PaymentRepository.createQueryBuilder("payment")
      .select("payment.methodArabic", "methodArabic")
      .addSelect("SUM(payment.price)", "totalPrice")
      .where("payment.createdAt >= :startTime", { startTime: start_Time })
      .andWhere("payment.createdAt <= :endTime", { endTime: end_Time })
      .groupBy("payment.methodArabic")
      .getRawMany();
    return results.reduce((acc, result) => {
      acc[result.methodArabic] = parseFloat(result.totalPrice) || 0;
      return acc;
    }, {});
  }
}
