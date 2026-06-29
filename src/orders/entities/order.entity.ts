import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  BeforeInsert,
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
import { PaymentStatus } from "../utils/payment.status.enum";

@Entity()
export class OrderEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => CustomerEntity, (doc) => doc.orders)
  customer: CustomerEntity;

  @Column({ type: "date" })
  date: string; // Reservation date

  @Column({ type: "varchar", nullable: true })
  orderInvoice: string; // Auto-increment column for invoice numbers

  generateRandomString(length: number): string {
    const chars = "ABCDEFGHIJKL01234MNOPQRSTUVWXYZ56789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  @BeforeInsert()
  generateOrderNumber() {
    this.orderInvoice = this.generateRandomString(8); // Generates an 8-character alphanumeric string
  }

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
    enum: PaymentStatus,
    default: PaymentStatus.PartiallyPaid,
  })
  paymentStatus: PaymentStatus;

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

  @Column({ type: "jsonb", nullable: true })
  branch: { id: string; name: string }; // Store branch details as a JSON object

  @ManyToOne(() => UserEntity, { nullable: true })
  updatedBy: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  confirmedBy: UserEntity;

  @CreateDateColumn()
  createdAt: Date; // Automatically set when the entity is created

  @UpdateDateColumn()
  updatedAt: Date; // Automatically updated when the entity is updated

  @ManyToOne(() => PaymentEntity, (payment) => payment.order) // Many orders can have one payment
  payment: PaymentEntity; // Single payment associated with the order

  @Column({ nullable: true }) // Optional column for the offer ID
  offerId?: string; // Add offer ID as an optional field

  @Column({ nullable: true }) // Optional column for the offer ID
  sharableOfferId?: string; // Add offer ID as an optional field

  @Column({ nullable: true }) // Optional column for the offer ID
  couponId?: string; // Add offer ID as an optional field

  @Column({ type: "boolean", default: false })
  isReviewed: boolean; // New boolean column

  @Column({ nullable: true })
  image_order_refund: string; // New field for the image URL

  @Column({ nullable: true })
  image_order_refund_reason: string; // New field for the image URL

  @Column({ nullable: true })
  assignedAt: Date;

  @Column({ nullable: true })
  startWorkingAt: Date;

  @Column({ nullable: true })
  colorCode: string;
}
