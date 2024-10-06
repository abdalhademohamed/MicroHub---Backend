import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { And, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { ReservationEntity } from "../reservation/entities/reservation.entity";
import { PaymentEntity } from "../payment/entities/payment.entity";
import { AnalysisDto } from "./dto/deposit.dto";
import { OrderStatus } from "../orders/utils/order.status.enum";
import { BranchEntity } from "../branch/entities/branch.entity";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { CustomerEntity } from "../customer/entities/customer.entity";
import { ServiceEntity } from "../service/entities/service.entity";

@Injectable()
export class AnalysisService {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly ReservationRepository: Repository<ReservationEntity>,
    @InjectRepository(PaymentEntity)
    private readonly PaymentRepository: Repository<PaymentEntity>,

    @InjectRepository(BranchEntity)
    private readonly BranchRepository: Repository<BranchEntity>,

    @InjectRepository(EmployeeEntity)
    private readonly EmployeeRepository: Repository<EmployeeEntity>,

    @InjectRepository(CustomerEntity)
    private readonly CustomerRepository: Repository<CustomerEntity>,

    @InjectRepository(ServiceEntity)
    private readonly ServiceRepository: Repository<ServiceEntity>,

  ) {}

  async getAllDeposits({ fromDate, toDate }: AnalysisDto) {
    if (!fromDate || !toDate) {
      fromDate = new Date();
      toDate = new Date(Date.now() - 24 * 3600 * 1000 * 7);
    }

    const deposits = await this.ReservationRepository.createQueryBuilder(
      "reservation",
    )
      .select("SUM(reservation.deposit)", "totalDeposit")
      .where("reservation.createdAt >= :fromDate", { fromDate: fromDate })
      .andWhere("reservation.createdAt <= :toDate", { toDate: toDate })
      .getRawOne();

    return parseFloat(deposits.totalDeposit || "0");
  }

  async getDepositsByBranch({ fromDate, toDate, branchId }: AnalysisDto) {
    if (!fromDate || !toDate) {
      fromDate = new Date();
      toDate = new Date(Date.now() - 24 * 3600 * 1000 * 7);
    }
    const deposits = await this.ReservationRepository.createQueryBuilder(
      "reservation",
    )
      .select("SUM(reservation.deposit)", "totalDeposit")
      .where("reservation.createdAt >= :fromDate", { fromDate: fromDate })
      .andWhere("reservation.createdAt <= :toDate", { toDate: toDate })
      .andWhere("reservation.branchId = :branchId", { branchId })
      .getRawOne();

    return parseFloat(deposits.totalDeposit || "0");
  }

  // Get totalPrice - deposit for a specific branch
  async getRemainingAmountByBranch(
    fromDate: Date,
    toDate: Date,
    branchId: string,
  ) {
    if (!fromDate || !toDate) {
      fromDate = new Date();
      toDate = new Date(Date.now() + 24 * 3600 * 1000 * 7);
    }

    const result = await this.ReservationRepository.createQueryBuilder(
      "reservation",
    )
      .select(
        "SUM(reservation.totalPrice - reservation.deposit)",
        "remainingAmount",
      )
      .where("reservation.start_Time >= :fromDate", { fromDate: fromDate })
      .andWhere("reservation.start_Time <= :toDate", { toDate: toDate })
      .andWhere("reservation.branchId = :branchId", { branchId })
      .getRawOne();

    return parseFloat(result.remainingAmount || "0");
  }

  async getTotalRemainingAmount(fromDate: Date, toDate: Date) {
    if (!fromDate || !toDate) {
      fromDate = new Date();
      toDate = new Date(Date.now() - 24 * 3600 * 1000 * 7);
    }

    const result = await this.ReservationRepository.createQueryBuilder(
      "reservation",
    )
      .select(
        "SUM(reservation.totalPrice - reservation.deposit)",
        "remainingAmount",
      )
      .where("reservation.start_Time >= :fromDate", { fromDate: fromDate })
      .andWhere("reservation.start_Time <= :toDate", { toDate: toDate })
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
    fromDate: Date,
    toDate: Date,
  ) {
    if (!fromDate || !toDate) {
      fromDate = new Date();
      toDate = new Date(Date.now() - 24 * 3600 * 1000 * 7);
    }
    const reservationsWithinTimeRange =
      await this.ReservationRepository.createQueryBuilder("reservation")
        .leftJoinAndSelect("reservation.order", "order")
        .where("order.status = :status", { status: OrderStatus.Canceled })
        .andWhere("reservation.start_Time BETWEEN :fromDate AND :toDate", {
          fromDate: fromDate,
          toDate: toDate,
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



  async getCount(): Promise<{
    branchCount: number;
    employeeCount: number;
    customerCount: number;
    serviceCount: number;
  }> {
    const branchCount = await this.BranchRepository.count();
    const employeeCount = await this.EmployeeRepository.count();
    const customerCount = await this.CustomerRepository.count();
    const serviceCount = await this.ServiceRepository.count();

    return {
      branchCount,
      employeeCount,
      customerCount,
      serviceCount,
    };
  }
}
