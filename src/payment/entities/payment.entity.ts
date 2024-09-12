import { ReservationEntity } from "../../reservation/entities/reservation.entity";
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";

@Entity()
export class PaymentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  methodEnglish: string;

  @Column({ type: "varchar", length: 255 })
  methodArabic: string;

  @Column({ nullable: true })
  price: number;

  @Column({ type: "varchar", length: 255 })
  image: string; // This will store the image URL or file path

  @Column({ default: new Date() })
  createdAt: Date;

  @ManyToOne(() => ReservationEntity)
  reservation: ReservationEntity; // One payment can belong to one reservation
}