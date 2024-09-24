import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ReservationEntity } from "../../reservation/entities/reservation.entity";
import { CommentEntity } from "../../comment/entities/comment.entity";
import { EmployeeEntity } from "../../employee/entities/employee.entity";
import { ReviewEntity } from "../../reviews/entities/review.entity";
import { ReceiptEntity } from "../../receipt/entities/receipt.entity";
import { OrderStatus } from "../utils/order.status.enum";
import { UserEntity } from "../../user/entities/user.entity";
import { PaymentEntity } from "../../payment/entities/payment.entity";
import { CustomerEntity } from "../../customer/entities/customer.entity";

@Entity()
export class OrderEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => CustomerEntity, (doc) => doc.orders)
  customer: CustomerEntity;

  @Column({ type: "date" })
  date: string; // Reservation date

  @Column({ type: "text" })
  serviceEnglish: string; // Description of the service in English

  @Column({ type: "text" })
  serviceArabic: string; // Description of the service in Arabic

  @Column({ type: "int", unique: true })
  invoiceNumber: number; // New field for invoice number

  @Column({ type: "enum", enum: OrderStatus })
  status: OrderStatus; // Status of the work

  @Column({
    type: "enum",
    enum: ["paid", "partially paid"], // Inline enum definition
    default: "partially paid", // Default value
  })
  paymentStatus: "paid" | "partially paid"; // TypeScript type

  @OneToOne(() => ReservationEntity, (reservation) => reservation.order)
  reservation: ReservationEntity;

  @OneToMany(() => CommentEntity, (CommentEntity) => CommentEntity.order)
  comments: CommentEntity[];

  @ManyToOne(() => EmployeeEntity, (EmployeeEntity) => EmployeeEntity.orders) // Add this relationship
  artist: EmployeeEntity; // The artist assigned to this order

  @OneToMany(() => ReviewEntity, (ReviewEntity) => ReviewEntity.order)
  reviews: ReviewEntity[]; // Reviews associated with the order

  @OneToMany(() => ReceiptEntity, (receipt) => receipt.order)
  receipts: ReceiptEntity[];
  @Column({ nullable: true })
  image_order_status_Url: string; // New field for the image URL

  @Column({ nullable: true })
  image_order_payment_status_Url: string; // New field for the image URL

  @ManyToOne(() => UserEntity, { nullable: true })
  createdBy: UserEntity;

  @Column({ type: "json", nullable: true })
  branch: { id: string; name: string }; // Store branch details as a JSON object

  @ManyToOne(() => UserEntity, { nullable: true })
  updatedBy: UserEntity;

  @CreateDateColumn()
  createdAt: Date; // Automatically set when the entity is created

  @UpdateDateColumn()
  updatedAt: Date; // Automatically updated when the entity is updated

  @OneToOne(() => PaymentEntity, (payment) => payment.order) // Update to OneToOne
  payment: PaymentEntity; // Single payment associated with the order
}
