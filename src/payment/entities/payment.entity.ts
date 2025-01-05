import { OrderEntity } from "../../orders/entities/order.entity";
import { ReservationEntity } from "../../reservation/entities/reservation.entity";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";

@Entity()
export class PaymentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  methodEnglish: string;

  @Column({ type: "varchar", length: 255 })
  methodArabic: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  image: string; // This will store the image URL or file path

  @Column({ default: new Date() })
  createdAt: Date;

  @ManyToOne(() => ReservationEntity)
  reservation: ReservationEntity; // One payment can belong to one reservation

  @OneToMany(() => OrderEntity, (order) => order.payment) // One payment can be associated with multiple orders
  order: OrderEntity[]; // List of orders associated with the payment
}
