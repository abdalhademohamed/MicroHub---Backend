import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { ReservationEntity } from '../../reservation/entities/reservation.entity';
import { CommentEntity } from '../../comment/entities/comment.entity';
import { EmployeeEntity } from '../../employee/entities/employee.entity';
import { ReviewEntity } from '../../reviews/entities/review.entity';

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

  @Column({ nullable: true })
  invoiceNumber: string; // Add this column for invoice number

  @Column({ type: 'enum', enum: ['working', 'done'], default: 'working' })
  status: 'working' | 'done'; // Status of the work

  @ManyToOne(() => ReservationEntity, reservation => reservation.orders)
  reservation: ReservationEntity;

  @OneToMany(() => CommentEntity, CommentEntity => CommentEntity.order)
  comments: CommentEntity[];

  @ManyToOne(() => EmployeeEntity, EmployeeEntity => EmployeeEntity.orders) // Add this relationship
  artist: EmployeeEntity; // The artist assigned to this order

  @OneToMany(() => ReviewEntity, (ReviewEntity) => ReviewEntity.order)
  reviews: ReviewEntity[]; // Reviews associated with the order
}
