import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { ReservationEntity } from '../../reservation/entities/reservation.entity';
import { CommentEntity } from '../../comment/entities/comment.entity';
import { EmployeeEntity } from '../../employee/entities/employee.entity';
import { ReviewEntity } from '../../reviews/entities/review.entity';
import { ReceiptEntity } from '../../receipt/entities/receipt.entity';
import { OrderStatus } from '../utils/order.status.enum';

@Entity()
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerName: string;

  @Column({ type: 'date' })
  date: string; // Reservation date

  @Column({ type: 'text' })
  service: string; // Description of the service

  @Column({ type: 'int', unique: true })
  invoiceNumber: number;  // New field for invoice number

  @Column({ type: 'enum', enum: OrderStatus})
  status: OrderStatus; // Status of the work

  @OneToOne(() => ReservationEntity, reservation => reservation.order)
  reservation: ReservationEntity;

  @OneToMany(() => CommentEntity, CommentEntity => CommentEntity.order)
  comments: CommentEntity[];

  @ManyToOne(() => EmployeeEntity, EmployeeEntity => EmployeeEntity.orders) // Add this relationship
  artist: EmployeeEntity; // The artist assigned to this order

  @OneToMany(() => ReviewEntity, (ReviewEntity) => ReviewEntity.order)
  reviews: ReviewEntity[]; // Reviews associated with the order


  @OneToMany(() => ReceiptEntity, receipt => receipt.order)
  receipts: ReceiptEntity[];
}
