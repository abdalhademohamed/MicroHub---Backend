import { OrderEntity } from '../../orders/entities/order.entity';
import { ServiceEntity } from '../../service/entities/service.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, ManyToMany, JoinTable } from 'typeorm';

@Entity()
export class ReceiptEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => OrderEntity, OrderEntity => OrderEntity.receipts)
  order: OrderEntity;


  // Date when the receipt is generated
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  generatedAt: Date;

  // Reservation time slot (can be a timestamp or a string depending on your implementation)
  @Column({ type: 'varchar', length: 100 })
  reservationTimeSlot: string;

  // A message written on the receipt
  @Column({ type: 'text', nullable: true })
  message: string;

  // Total payment for the order
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPayment: number;

  // Payment for services (can be an array of service names or a string listing the services)
  @Column({ type: 'text' })
  paymentForServices: string;

  // Discount applied to the order
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  // Remaining balance after the discount
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  remaining: number;

  // Created by user reference
  @ManyToOne(() => UserEntity, { nullable: true })
  createdBy: UserEntity;

  

  @ManyToMany(() => ServiceEntity, ServiceEntity => ServiceEntity.receipts)
  @JoinTable()
  services: ServiceEntity[];
}
