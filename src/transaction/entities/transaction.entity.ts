import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Column,
} from "typeorm";
import { OrderEntity } from "../../orders/entities/order.entity";
import { PaymentEntity } from "src/payment/entities/payment.entity";

@Entity()
export class TransactionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => OrderEntity)
  order: OrderEntity;

  @Column({ type: "float", nullable: true })
  amount: number;

  @CreateDateColumn()
  createdAt: Date; // Automatically set when the entity is created

  @ManyToOne( () => PaymentEntity ) // Many orders can have one payment
  payment: PaymentEntity; // Single payment associated with the order
}

