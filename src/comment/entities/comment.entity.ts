import { EmployeeEntity } from "../../employee/entities/employee.entity";
import { OrderEntity } from "../../orders/entities/order.entity";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";

@Entity()
export class CommentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text" })
  content: string; // Comment content

  @Column()
  imageBeforeUrl: string; // URL of the uploaded image
  @Column()
  imageAfterUrl: string; // URL of the uploaded image

  @ManyToOne(() => OrderEntity, (order) => order.comments)
  order: OrderEntity;

  @ManyToOne(() => EmployeeEntity, (employee) => employee.comments)
  employee: EmployeeEntity;

  @CreateDateColumn()
  createdAt: Date; // Automatically set the date when the comment is created
}
