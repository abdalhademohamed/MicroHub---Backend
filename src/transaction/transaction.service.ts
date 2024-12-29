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
      const transaction = this.transactionRepository.create({
        order,
        amount: body.amount,
        createdAt: new Date(),
      });
      if(body.paymentId){
        transaction.payment = await this.paymentRepository.findOne({ where: { id: body.paymentId } });
      }
      await this.transactionRepository.save(transaction);
    }
}