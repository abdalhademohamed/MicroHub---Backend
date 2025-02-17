import { Injectable, OnModuleInit } from "@nestjs/common";
import { CreateTransactionDto } from "./dto/create.transaction.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { PaymentEntity } from "src/payment/entities/payment.entity";
import { Repository } from "typeorm";
import { OrderEntity } from "src/orders/entities/order.entity";
import { TransactionEntity } from "./entities/transaction.entity";
import { BranchEntity } from "src/branch/entities/branch.entity";
import { FindTransactionDto } from "./dto/query.transaction.dto";
import { UserEntity } from "src/user/entities/user.entity";
import { ExcelService } from "src/excel/excel.service";
import { Response } from "express";

@Injectable()
export class TransactionService implements OnModuleInit {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private excelService: ExcelService,
  ) {}
  async onModuleInit() {
    let payment = await this.paymentRepository.findOne({
      where: { methodEnglish: "free" },
    });
    if (!payment) {
      const result = this.paymentRepository.create({
        methodEnglish: "free",
        methodArabic: "مجاني",
      });
      await this.paymentRepository.save(result);
      console.log(result);
    }
  }
  async createTransaction(body: CreateTransactionDto) {
    const order = await this.orderRepository.findOne({
      where: { id: body.orderId },
    });
    const transaction = this.transactionRepository.create({
      order,
      amount: Number(body.amount),
      createdAt: new Date(),
    });
    transaction.user = await this.userRepository.findOne({
      where: { id: body.userId },
    });
    transaction.branch = await this.branchRepository.findOne({
      where: { id: order.branch.id },
      relations: {
        reservations: true,
      },
    });
    if (body.paymentId) {
      transaction.payment = await this.paymentRepository.findOne({
        where: { id: body.paymentId },
      });
    } else if (transaction.amount == 0) {
      transaction.payment = await this.paymentRepository.findOne({
        where: { methodEnglish: "free" },
      });
    }
    await this.transactionRepository.save(transaction);
  }
  async latestTransaction(findTransactionDto: FindTransactionDto) {
    const {
      page = 1,
      limit = 10,
      sort = "desc",
      branch,
      fromDate,
      toDate,
      payment,
    } = findTransactionDto;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.branch", "branch") // Join the Branch entity
      .leftJoinAndSelect("transaction.payment", "payment"); // Join the Payment entity

    // Apply filters conditionally
    if (branch) {
      queryBuilder.andWhere("branch.id = :branchId", { branchId: branch });
    }

    if (payment) {
      queryBuilder.andWhere("payment.id = :paymentId", { paymentId: payment });
    }

    if (fromDate) {
      queryBuilder.andWhere("transaction.createdAt >= :fromDate", { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere("transaction.createdAt <= :toDate", { toDate });
    }

    // Apply sorting
    queryBuilder.orderBy(
      "transaction.createdAt",
      sort.toUpperCase() as "ASC" | "DESC",
    );

    // Apply pagination
    queryBuilder.skip((page - 1) * limit).take(limit);

    // Execute query and get results
    const [data, total] = await queryBuilder.getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
    };
  }
  async incomeAggregations(findTransactionDto: FindTransactionDto) {
    const { branch, fromDate, toDate, payment } = findTransactionDto;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder("transaction")
      .select("SUM(transaction.amount)", "totalIncome")
      .innerJoin("transaction.branch", "branch")
      .innerJoin("transaction.payment", "payment")
      .where("transaction.amount > 0"); // Filter income transactions

    // Apply filters for branch and payment
    if (branch) {
      queryBuilder.andWhere("branch.id = :branch", { branch });
    }

    if (payment) {
      queryBuilder.andWhere("payment.id = :payment", { payment });
    }

    // Apply date filters
    if (fromDate) {
      queryBuilder.andWhere("transaction.createdAt >= :fromDate", { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere("transaction.createdAt <= :toDate", { toDate });
    }

    // Execute query
    const result = await queryBuilder.getRawOne();
    return { totalIncome: result?.totalIncome || 0 };
  }
  async refundAggregations(findTransactionDto: FindTransactionDto) {
    const { branch, fromDate, toDate, payment } = findTransactionDto;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder("transaction")
      .select("SUM(transaction.amount)", "totalRefund")
      .innerJoin("transaction.branch", "branch")
      .innerJoin("transaction.payment", "payment")
      .where("transaction.amount < 0"); // Filter refund transactions

    // Apply filters for branch and payment
    if (branch) {
      queryBuilder.andWhere("branch.id = :branch", { branch });
    }

    if (payment) {
      queryBuilder.andWhere("payment.id = :payment", { payment });
    }

    // Apply date filters
    if (fromDate) {
      queryBuilder.andWhere("transaction.createdAt >= :fromDate", { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere("transaction.createdAt <= :toDate", { toDate });
    }

    // Execute query
    const result = await queryBuilder.getRawOne();
    return { totalRefund: result?.totalRefund * -1 || 0 };
  }
  async incomeAndRefundAggregations(findTransactionDto: FindTransactionDto) {
    const {
      branch,
      fromDate,
      toDate,
      payment,
      page = 1,
      limit = 20,
      keyword,
    } = findTransactionDto;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder("transaction")
      .select("user.id", "userId") // Select user ID
      .addSelect("user.username", "userName") // Select user name
      .addSelect("user.email", "userEmail") // Select user email
      .addSelect(
        "SUM(CASE WHEN transaction.amount > 0 THEN transaction.amount ELSE 0 END)",
        "totalIncome",
      ) // Sum of income
      .addSelect(
        "SUM(CASE WHEN transaction.amount < 0 THEN transaction.amount ELSE 0 END)",
        "totalRefund",
      ) // Sum of refund
      .addSelect(
        "SUM(CASE WHEN createdBy.id = user.id THEN 1 ElSE 0 END )",
        "orderCount",
      ) // Count of all orders created by user
      // .addSelect('COUNT(DISTINCT CASE WHEN order.status = :cancelledStatus THEN order.id ELSE NULL END)', OrderStatus.Canceled)  // Count cancelled orders
      .innerJoin("transaction.user", "user") // Join user table
      .innerJoin("transaction.branch", "branch") // Join branch table
      .innerJoin("transaction.payment", "payment") // Join payment table
      .leftJoin("transaction.order", "order") // Join order table (left join to include users without orders)
      .leftJoin("order.createdBy", "createdBy")
      .leftJoin("order.artist", "employee") // Join employee (artist) table to count employees
      .where("transaction.amount != 0"); // Exclude transactions with 0 amount

    // Apply filters for branch and payment
    if (branch) {
      queryBuilder.andWhere("branch.id = :branch", { branch });
    }

    if (keyword) {
      queryBuilder.andWhere("user.username LIKE :keyword", {
        keyword: `%${keyword}%`,
      });
    }

    if (payment) {
      queryBuilder.andWhere("payment.id = :payment", { payment });
    }

    // Apply date filters
    if (fromDate) {
      queryBuilder.andWhere("transaction.createdAt >= :fromDate", { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere("transaction.createdAt <= :toDate", { toDate });
    }

    // Group by user to calculate total income, refund, and order counts
    queryBuilder.groupBy("user.id");
    queryBuilder.addGroupBy("employee.id"); // Group by employee to get employee-level aggregations

    const totalRowsQuery = queryBuilder
      .clone()
      .select("COUNT(DISTINCT user.id)", "totalRows"); // Count total number of rows

    const totalRowsResult = await totalRowsQuery.getRawOne(); // Execute the query to get the count

    // Pagination (skip and take)
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const result = await queryBuilder.getRawMany();

    // Map the result and include the necessary fields
    const data = result.map((entry) => ({
      userId: entry.userId,
      userName: entry.userName,
      userEmail: entry.userEmail,
      totalIncome: parseFloat(entry.totalIncome),
      totalRefund: parseFloat(entry.totalRefund),
      orderCount: parseInt(entry.orderCount, 10), // Number of orders created by the user
      // cancelledOrderCount: parseInt(entry.cancelledOrderCount, 10),  // Number of cancelled orders
      employeeId: entry.employeeId, // Employee ID
      employeeName: entry.employeeName, // Employee name
    }));
    console.log(totalRowsResult);
    const totalPages = Math.ceil(totalRowsResult?.totalRows || 0 / limit);

    // Return paginated and sorted result
    return {
      items: data,
      total: limit,
      currentPage: page,
      totalPages,
    };
  }
  async getPaymentStatisticsWithDetails(obj: FindTransactionDto) {
    const { branch, fromDate, toDate, keyword } = obj;
    const queryBuilder = this.transactionRepository
      .createQueryBuilder("transaction")
      .innerJoinAndSelect("transaction.payment", "payment") // Join with PaymentEntity
      .select("payment.id", "paymentId")
      .addSelect("payment.methodEnglish", "methodName") // Include the method name
      .addSelect("payment.image", "methodImage") // Include the method image
      .addSelect("COUNT(transaction.id)", "numberOfTransactions")
      .leftJoin("transaction.branch", "branch")
      .addSelect(
        "SUM(CASE WHEN transaction.amount > 0 THEN transaction.amount ELSE 0 END)",
        "totalIncome",
      )
      .addSelect(
        "SUM(CASE WHEN transaction.amount < 0 THEN ABS(transaction.amount) ELSE 0 END)",
        "totalRefund",
      );

    if (keyword) {
      queryBuilder.where("payment.methodEnglish LIKE :keyword", {
        keyword: `%${keyword}%`,
      });
    }

    if (fromDate) {
      queryBuilder.andWhere("transaction.createdAt >= :fromDate", { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere("transaction.createdAt <= :toDate", { toDate });
    }

    if (branch) {
      queryBuilder.andWhere("branch.id = :branch", { branch });
    }

    queryBuilder
      .groupBy("payment.id")
      .addGroupBy("payment.methodEnglish")
      .addGroupBy("payment.image");

    const stats = await queryBuilder.getRawMany();

    return { items: stats };
  }
  async getPaymentStaticesExcel(
    query: FindTransactionDto,
    res: Response,
    type: string,
  ) {
    const { items } = await this.getPaymentStatisticsWithDetails(query);
    let totalIn = 0;
    let totalOut = 0;
    let total = 0;
    const result = items.map(
      ({ methodName, totalIncome, totalRefund, numberOfTransactions }) => {
        totalIn += Number(totalIncome);
        totalOut += Number(totalRefund);
        total += Number(numberOfTransactions);
        return { methodName, totalIncome, totalRefund, numberOfTransactions };
      },
    );
    return this.excelService.exportFile(result, res, type, {
      totalIncome: totalIn,
      totalRefund: totalOut,
      numberOfTransactions: total,
    });
  }
  async refundIncomeExcel(
    findTransactionDto: FindTransactionDto,
    res: Response,
    type: string,
  ) {
    const { totalRefund } = await this.refundAggregations(findTransactionDto);
    const { totalIncome } = await this.incomeAggregations(findTransactionDto);
    return this.excelService.exportFile(
      [{ totalIncome, totalRefund }],
      res,
      type,
    );
  }
  async incomeAndRefundAggregationsExcel(
    findTransactionDto: FindTransactionDto,
    res: Response,
    type: string,
  ) {
    const { branch, fromDate, toDate, payment } = findTransactionDto;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder("transaction")
      .select("user.id", "userId")
      .addSelect("user.username", "userName")
      .addSelect("user.email", "userEmail")
      .addSelect(
        "SUM(CASE WHEN transaction.amount > 0 THEN transaction.amount ELSE 0 END)",
        "totalIncome",
      )
      .addSelect(
        "SUM(CASE WHEN transaction.amount < 0 THEN transaction.amount ELSE 0 END)",
        "totalRefund",
      )
      .addSelect(
        "SUM(CASE WHEN createdBy.id = user.id THEN 1 ElSE 0 END )",
        "orderCount",
      )
      .innerJoin("transaction.user", "user")
      .innerJoin("transaction.branch", "branch")
      .innerJoin("transaction.payment", "payment")
      .leftJoin("transaction.order", "order")
      .leftJoin("order.createdBy", "createdBy")
      .where("transaction.amount != 0");

    if (branch) {
      queryBuilder.andWhere("branch.id = :branch", { branch });
    }

    if (payment) {
      queryBuilder.andWhere("payment.id = :payment", { payment });
    }

    // Apply date filters
    if (fromDate) {
      queryBuilder.andWhere("transaction.createdAt >= :fromDate", { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere("transaction.createdAt <= :toDate", { toDate });
    }

    queryBuilder.groupBy("user.id");
    queryBuilder.addGroupBy("user.username");
    queryBuilder.addGroupBy("user.email");

    const result = await queryBuilder.getRawMany();

    console.log(result);
    let totalIn = 0;
    let totalOut = 0;
    let totalOrder = 0;

    // Map the result and include the necessary fields
    const data = result.map((entry) => {
      totalIn += parseFloat(entry.totalIncome);
      totalOut +=  parseFloat(entry.totalRefund);
      totalOrder += parseInt(entry.orderCount, 10); // Number of orders created by the user
      return {
        userName: entry.userName,
        userEmail: entry.userEmail,
        totalIncome: parseFloat(entry.totalIncome),
        totalRefund: parseFloat(entry.totalRefund),
        orderCount: parseInt(entry.orderCount, 10), // Number of orders created by the user
      };
    });

    console.log(data);

    return this.excelService.exportFile(data, res, type, {
      totalIncome: totalIn,
      totalRefund: totalOut,
      orderCount: totalOrder,
    });
  }
  async latestTransactionExcel(
    findTransactionDto: FindTransactionDto,
    res: Response,
    type: string,
  ) {
    const { data } = await this.latestTransaction(findTransactionDto);
    let totalAmount = 0;
    const result = data.map(({ amount, createdAt, branch, payment }) => {
      totalAmount += Number(amount);
      return {
        branchName: branch.name,
        paymentMethod: payment?.methodArabic,
        amount,
        createdAt: `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}-${createdAt.getDate()}`,
      };
    });
    return this.excelService.exportFile(result, res, type, {
      amount: totalAmount,
    });
  }
}
