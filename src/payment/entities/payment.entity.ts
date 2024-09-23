import { OrderEntity } from "../../orders/entities/order.entity";
import { ReservationEntity } from "../../reservation/entities/reservation.entity";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from "typeorm";

@Entity()
export class PaymentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  methodEnglish: string;

  @Column({ type: "varchar", length: 255 })
  methodArabic: string;

  @Column({ type: "varchar", length: 255 })
  image: string; // This will store the image URL or file path

  @Column({ default: new Date() })
  createdAt: Date;

  @ManyToOne(() => ReservationEntity)
  reservation: ReservationEntity; // One payment can belong to one reservation

  @OneToOne(() => OrderEntity, (order) => order.payment) // Update to OneToOne
  @JoinColumn() // This decorator specifies that this entity owns the relationship
  order: OrderEntity; // Single order associated with the payment
}
