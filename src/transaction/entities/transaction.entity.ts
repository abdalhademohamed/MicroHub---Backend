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
import { EmployeeEntity } from "src/employee/entities/employee.entity";
import { UserEntity } from "src/user/entities/user.entity";

@Entity()
export class TransactionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => OrderEntity)
  order: OrderEntity;

  @ManyToOne(() => BranchEntity)
  @JoinColumn({ name: "branchId" }) // Explicitly set foreign key column name
  branch: BranchEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "userId" }) // Explicitly set foreign key column name
  user: UserEntity;

  @Column({ type: "float", nullable: true })
  amount: number;

  @Column({ nullable: true })
  type: string;

  @CreateDateColumn()
  createdAt: Date; // Automatically set when the entity is created

  @ManyToOne(() => PaymentEntity) // Many orders can have one payment
  @JoinColumn({ name: "paymentId" }) // Explicitly set foreign key column name
  payment: PaymentEntity; // Single payment associated with the order
}
