import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "../user/entities/user.entity";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";
import { TransactionEntity } from "./entities/transaction.entity";
import { OrderEntity } from "src/orders/entities/order.entity";
import { PaymentEntity } from "src/payment/entities/payment.entity";
import { BranchEntity } from "src/branch/entities/branch.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionEntity,
      UserEntity,
      OrderEntity,
      PaymentEntity,
      BranchEntity,
    ]),
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
