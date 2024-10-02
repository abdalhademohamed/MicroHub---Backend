import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { And, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { ReservationEntity } from "../reservation/entities/reservation.entity";
import { PaymentEntity } from "../payment/entities/payment.entity";
import { AnalysisDto } from "./dto/deposit.dto";
import { OrderStatus } from "../orders/utils/order.status.enum";

@Injectable()
export class AnalysisService {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly ReservationRepository: Repository<ReservationEntity>,
    @InjectRepository(PaymentEntity)
    private readonly PaymentRepository: Repository<PaymentEntity>,
  ) {}

  async getAllDeposits({ start_Time, end_Time }: AnalysisDto) {
    if (!start_Time || !end_Time) {
      start_Time = new Date();
      end_Time = new Date(Date.now() - 24 * 3600 * 1000 * 7);
    }

    const deposits = await this.ReservationRepository.createQueryBuilder(
      "reservation",
    )
      .select("SUM(reservation.deposit)", "totalDeposit")
      .where("reservation.createdAt >= :startTime", { startTime: start_Time })
      .andWhere("reservation.createdAt <= :endTime", { endTime: end_Time })
      .getRawOne();

    return parseFloat(deposits.totalDeposit || "0");
  }

  async getDepositsByBranch({ start_Time, end_Time, branchId }: AnalysisDto) {
    if (!start_Time || !end_Time) {
      start_Time = new Date();
      end_Time = new Date(Date.now() - 24 * 3600 * 1000 * 7);
    }
    const deposits = await this.ReservationRepository.createQueryBuilder(
      "reservation",
    )
      .select("SUM(reservation.deposit)", "totalDeposit")
      .where("reservation.createdAt >= :startTime", { startTime: start_Time })
      .andWhere("reservation.createdAt <= :endTime", { endTime: end_Time })
      .andWhere("reservation.branchId = :branchId", { branchId })
      .getRawOne();

    return parseFloat(deposits.totalDeposit || "0");
  }

  // Get totalPrice - deposit for a specific branch
  async getRemainingAmountByBranch(
    start_Time: Date,
    end_Time: Date,
    branchId: string,
  ) {
    if (!start_Time || !end_Time) {
      start_Time = new Date();
      end_Time = new Date(Date.now() + 24 * 3600 * 1000 * 7);
    }

    const result = await this.ReservationRepository.createQueryBuilder(
      "reservation",
    )
      .select(
        "SUM(reservation.totalPrice - reservation.deposit)",
        "remainingAmount",
      )
      .where("reservation.start_Time >= :startTime", { startTime: start_Time })
      .andWhere("reservation.start_Time <= :endTime", { endTime: end_Time })
      .andWhere("reservation.branchId = :branchId", { branchId })
      .getRawOne();

    return parseFloat(result.remainingAmount || "0");
  }

  async getTotalRemainingAmount(start_Time: Date, end_Time: Date) {
    if (!start_Time || !end_Time) {
      start_Time = new Date();
      end_Time = new Date(Date.now() - 24 * 3600 * 1000 * 7);
    }

    const result = await this.ReservationRepository.createQueryBuilder(
      "reservation",
    )
      .select(
        "SUM(reservation.totalPrice - reservation.deposit)",
        "remainingAmount",
      )
      .where("reservation.start_Time >= :startTime", { startTime: start_Time })
      .andWhere("reservation.start_Time <= :endTime", { endTime: end_Time })
      .getRawOne();

    return parseFloat(result.remainingAmount || "0");
  }

  async getAllPrices() {
    const result = await this.PaymentRepository.createQueryBuilder("payment")
      .select("SUM(payment.price)", "totalPrice")
      .getRawOne();

    return parseFloat(result.totalPrice || "0");
  }

  async getPricesGroupedByMethod() {
    const results = await this.PaymentRepository.createQueryBuilder("payment")
      .select("payment.methodEnglish", "method")
      .addSelect("SUM(payment.price)", "totalPrice")
      .groupBy("payment.methodEnglish")
      .getRawMany();

    return results.reduce((acc, result) => {
      acc[result.method] = parseFloat(result.totalPrice) || 0;
      return acc;
    }, {});
  }
  async getTotalReturnedMoneyFromCanceledOrdersByTimeRange(
    startTime: Date,
    endTime: Date,
  ) {
    if (!startTime || !endTime) {
      startTime = new Date();
      endTime = new Date(Date.now() - 24 * 3600 * 1000 * 7);
    }
    const reservationsWithinTimeRange =
      await this.ReservationRepository.createQueryBuilder("reservation")
        .leftJoinAndSelect("reservation.order", "order")
        .where("order.status = :status", { status: OrderStatus.Canceled })
        .andWhere("reservation.start_Time BETWEEN :start AND :end", {
          start: startTime,
          end: endTime,
        })
        .select([
          "reservation.id",
          "reservation.totalPrice",
          "reservation.deposit",
          "order.invoiceNumber",
        ])
        .getMany();

    const totalReturnedMoney = reservationsWithinTimeRange.reduce(
      (total, reservation) =>
        total +
        Number(reservation.deposit ?? 0) +
        Number(reservation.totalPrice ?? 0),
      0,
    );

    return totalReturnedMoney;
  }
}
