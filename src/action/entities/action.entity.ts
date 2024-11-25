import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Column,
} from "typeorm";
import { UserEntity } from "../../user/entities/user.entity";
import { OrderEntity } from "../../orders/entities/order.entity";

@Entity()
export class ActionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  action: string;

  @ManyToOne(() => UserEntity)
  createdBy: UserEntity;

  @ManyToOne(() => OrderEntity)
  order: OrderEntity;

  @CreateDateColumn()
  createdAt: Date; // Automatically set when the entity is created
}
