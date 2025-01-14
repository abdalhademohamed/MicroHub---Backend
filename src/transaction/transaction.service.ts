import { Injectable, OnModuleInit } from "@nestjs/common";
import { CreateTransactionDto } from "./dto/create.transaction.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { PaymentEntity } from "src/payment/entities/payment.entity";
import { Repository } from "typeorm";
import { OrderEntity } from "src/orders/entities/order.entity";
import { TransactionEntity } from "./entities/transaction.entity";
import { BranchEntity } from "src/branch/entities/branch.entity";
import { FindTransactionDto } from "./dto/query.transaction.dto";
import { EmployeeEntity } from "src/employee/entities/employee.entity";
import { UserEntity } from "src/user/entities/user.entity";

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
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
  ) {}
  async onModuleInit() {
      let payment = await this.paymentRepository.findOne({ where: { methodEnglish: 'free' } });
      if(!payment){
        const result = this.paymentRepository.create({
          methodEnglish: 'free',
          methodArabic: 'مجاني',
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
    })
    transaction.branch = await this.branchRepository.findOne({
      where: { id: order.branch.id },
      relations: {
        reservations: true,
      }
    });
    if (body.paymentId) {
      transaction.payment = await this.paymentRepository.findOne({
        where: { id: body.paymentId },
      });
    } else if( transaction.amount == 0 ) {
      transaction.payment = await this.paymentRepository.findOne({ where: { methodEnglish: 'free' } })
    }
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
  async incomeAndRefundAggregations(findTransactionDto: FindTransactionDto) {
    const { branch, fromDate, toDate, payment, page = 1, limit = 20 } = findTransactionDto;
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .select('user.id', 'userId')  // Select user ID
      .addSelect('user.username', 'userName')  // Select user English name
      .addSelect('user.email', 'userEmail')  // Select user Arabic name
      .addSelect('SUM(CASE WHEN transaction.amount > 0 THEN transaction.amount ELSE 0 END)', 'totalIncome')  // Sum of income
      .addSelect('SUM(CASE WHEN transaction.amount < 0 THEN transaction.amount ELSE 0 END)', 'totalRefund')  // Sum of refund
      .innerJoin('transaction.user', 'user')  // Join user table
      .innerJoin('transaction.branch', 'branch')  // Join branch table
      .innerJoin('transaction.payment', 'payment')  // Join payment table
      .where('transaction.amount != 0');  // Exclude transactions with 0 amount
  
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
  
    // Group by user to calculate total income and refund for each one
    queryBuilder.groupBy('user.id');
  
    const skip = (page - 1) * limit;
    // Execute query
    const result = await queryBuilder.skip(skip).limit(limit).getRawMany();
  
    // Return the detailed information for each user
    return result.map((entry) => ({
      id: entry.userId,
      name: entry.userName,
      email: entry.userEmail,
      totalIncome: parseFloat(entry.totalIncome), // Convert to float if necessary
      totalRefund: parseFloat(entry.totalRefund), // Convert to float if necessary
    }));
  }  
  
}
