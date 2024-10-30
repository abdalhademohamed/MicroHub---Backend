import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { OrderEntity } from "../../orders/entities/order.entity";
import { EmployeeEntity } from "../../employee/entities/employee.entity";

@Entity()
export class ReviewEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  imageOrder: string; // before after

  @Column({ type: "int", default: 1 })
  rating: number;

  @ManyToOne(() => EmployeeEntity, (EmployeeEntity) => EmployeeEntity.reviews)
  employee: EmployeeEntity; // Reference to the employee who made the review

  @ManyToOne(() => EmployeeEntity, (doc) => doc.reviews)
  // @JoinColumn('artistId')
  artist: EmployeeEntity; // Reference to the order being reviewed

  @ManyToOne(() => OrderEntity, (OrderEntity) => OrderEntity.reviews)
  order: OrderEntity; // Reference to the order being reviewed

  @Column({ type: "boolean", default: false })
  orderFirstTime: boolean;


  @Column({ default: new Date() })
  createdAt: Date; 
  @Column({nullable:true})
  comment_Before: string; // before after

    
  @Column({nullable:true})
  comment_After: string; // before after
}
