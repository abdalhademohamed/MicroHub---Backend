import { EmployeeEntity } from '../../employee/entities/employee.entity';
import { OrderEntity } from '../../orders/entities/order.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

@Entity()
export class CommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string; // Comment content

  @Column()
  imageUrl: string; // URL of the uploaded image

  @ManyToOne(() => OrderEntity, order => order.comments)
  order: OrderEntity;


  @ManyToOne(() => EmployeeEntity, EmployeeEntity => EmployeeEntity.comments)
  employee: EmployeeEntity; // Reference to the employee who made the comment

  
}
