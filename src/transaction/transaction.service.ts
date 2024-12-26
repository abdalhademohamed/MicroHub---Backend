import { Injectable } from "@nestjs/common";
import { CreateTransactionDto } from "./dto/create.transaction.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { PaymentEntity } from "src/payment/entities/payment.entity";
import { Repository } from "typeorm";
import { OrderEntity } from "src/orders/entities/order.entity";
import { TransactionEntity } from "./entities/transaction.entity";

@Injectable()
export class TransactionService {
    constructor(
        @InjectRepository(PaymentEntity)
        private readonly paymentRepository: Repository<PaymentEntity>,
        @InjectRepository(OrderEntity)
        private readonly orderRepository: Repository<OrderEntity>,
        @InjectRepository(TransactionEntity)
        private readonly transactionRepository: Repository<TransactionEntity>,
    ) {}
    async createTransaction(body: CreateTransactionDto) {
      const order = await this.orderRepository.findOne({ where: { id: body.orderId } });
      const payment = await this.paymentRepository.findOne({ where: { id: body.paymentId } });
      const transaction = this.transactionRepository.create({
        order,
        payment,
        createdAt: new Date(),
      });
      await this.transactionRepository.save(transaction);
    }
    async getAllTransactionsToOrder(orderId: string) {
      const queryBuilder = this.transactionRepository.createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.payment', 'payment')
            .leftJoinAndSelect('transaction.order', 'order')
            .where('order.id = :orderId', { orderId })
            .orderBy('transaction.createdAt', 'DESC');
      const [transactions, totalItems] = await queryBuilder.getManyAndCount();   
      return { items: transactions, totalItems };
    }
}