import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Column,
  JoinColumn,
} from "typeorm";
import { OrderEntity } from "../../orders/entities/order.entity";
import { PaymentEntity } from "src/payment/entities/payment.entity";
import { BranchEntity } from "src/branch/entities/branch.entity";

@Entity()
export class TransactionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => OrderEntity)
  order: OrderEntity;

  @ManyToOne(() => BranchEntity)
  @JoinColumn({ name: 'branchId' }) // Explicitly set foreign key column name
  branch: BranchEntity;

  @Column({ type: "float", nullable: true })
  amount: number;

  @CreateDateColumn()
  createdAt: Date; // Automatically set when the entity is created

  @ManyToOne(() => PaymentEntity) // Many orders can have one payment
  @JoinColumn({ name: 'paymentId' }) // Explicitly set foreign key column name
  payment: PaymentEntity; // Single payment associated with the order
}
