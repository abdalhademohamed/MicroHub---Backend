import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { OrderEntity } from "../../orders/entities/order.entity";
import { EmployeeEntity } from "../../employee/entities/employee.entity";

@Entity()
export class ReviewEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;


  
  @Column({ type: "int", default: 1})
  
  totalReviews: number; // Total number of reviews

  @Column({ type: "int", default: 1 })
  newestReviews: number; // Number of newest reviews

  @Column({ type: "int", default: 1 })
  oldestReviews: number; // Number of oldest reviews

  @ManyToOne(() => EmployeeEntity, (EmployeeEntity) => EmployeeEntity.reviews)
  employee: EmployeeEntity; // Reference to the employee who made the review

  @ManyToOne(() => OrderEntity, (OrderEntity) => OrderEntity.reviews)
  order: OrderEntity; // Reference to the order being reviewed
}
