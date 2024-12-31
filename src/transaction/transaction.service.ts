import { Injectable } from "@nestjs/common";
import { CreateTransactionDto } from "./dto/create.transaction.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { PaymentEntity } from "src/payment/entities/payment.entity";
import { Repository } from "typeorm";
import { OrderEntity } from "src/orders/entities/order.entity";
import { TransactionEntity } from "./entities/transaction.entity";
import { BranchEntity } from "src/branch/entities/branch.entity";
import { FindTransactionDto } from "./dto/query.transaction.dto";

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
  ) {}
  async createTransaction(body: CreateTransactionDto) {
    console.log(body.amount);
    const order = await this.orderRepository.findOne({
      where: { id: body.orderId },
    });
    const transaction = this.transactionRepository.create({
      order,
      amount: Number(body.amount),
      createdAt: new Date(),
    });
    transaction.branch = await this.branchRepository.findOne({
      where: { id: order.branch.id },
    });
    if (body.paymentId) {
      transaction.payment = await this.paymentRepository.findOne({
        where: { id: body.paymentId },
      });
    }
    console.log(transaction);
    await this.transactionRepository.save(transaction);
  }
  async latestTransaction(findTransactionDto: FindTransactionDto) {
    const {
      page = 1,
      limit = 10,
      sort = 'desc',
      branch,
      fromDate,
      toDate,
      payment,
    } = findTransactionDto;
  
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.branch', 'branch') // Join the Branch entity
      .leftJoinAndSelect('transaction.payment', 'payment'); // Join the Payment entity
  
    // Apply filters conditionally
    if (branch) {
      queryBuilder.andWhere('branch.id = :branchId', { branchId: branch });
    }
  
    if (payment) {
      queryBuilder.andWhere('payment.id = :paymentId', { paymentId: payment });
    }
  
    if (fromDate) {
      queryBuilder.andWhere('transaction.createdAt >= :fromDate', { fromDate });
    }
  
    if (toDate) {
      queryBuilder.andWhere('transaction.createdAt <= :toDate', { toDate });
    }
  
    // Apply sorting
    queryBuilder.orderBy('transaction.createdAt', sort.toUpperCase() as 'ASC' | 'DESC');
  
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
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'totalIncome')
      .innerJoin('transaction.branch', 'branch')
      .innerJoin('transaction.payment', 'payment')
      .where('transaction.amount > 0'); // Filter income transactions
  
    // Apply filters for branch and payment
    if (branch) {
      queryBuilder.andWhere('branch.id = :branch', { branch });
    }
  
    if (payment) {
      queryBuilder.andWhere('payment.id = :payment', { payment });
    }
  
    // Apply date filters
    if (fromDate) {
      queryBuilder.andWhere('transaction.createdAt >= :fromDate', { fromDate });
    }
  
    if (toDate) {
      queryBuilder.andWhere('transaction.createdAt <= :toDate', { toDate });
    }
  
    // Execute query
    const result = await queryBuilder.getRawOne();
    return { totalIncome: result?.totalIncome || 0 };
  }
  async refundAggregations(findTransactionDto: FindTransactionDto) {
    const { branch, fromDate, toDate, payment } = findTransactionDto;
  
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'totalRefund')
      .innerJoin('transaction.branch', 'branch')
      .innerJoin('transaction.payment', 'payment')
      .where('transaction.amount < 0'); // Filter refund transactions
  
    // Apply filters for branch and payment
    if (branch) {
      queryBuilder.andWhere('branch.id = :branch', { branch });
    }
  
    if (payment) {
      queryBuilder.andWhere('payment.id = :payment', { payment });
    }
  
    // Apply date filters
    if (fromDate) {
      queryBuilder.andWhere('transaction.createdAt >= :fromDate', { fromDate });
    }
  
    if (toDate) {
      queryBuilder.andWhere('transaction.createdAt <= :toDate', { toDate });
    }
  
    // Execute query
    const result = await queryBuilder.getRawOne();
    return { totalRefund: result?.totalRefund * -1 || 0 };
  }
}
