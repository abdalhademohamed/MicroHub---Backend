import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  ManyToMany,
  OneToMany,
  DeleteDateColumn,
  JoinTable,
} from "typeorm";
import { BranchEntity } from "../../branch/entities/branch.entity";
import { PositionEntity } from "../../postion/entities/postion.entity";
import { EmployeeTypeEntity } from "../../employetype/entities/employetype.entity";
import { ReservationEntity } from "../../reservation/entities/reservation.entity";
import { OrderEntity } from "../../orders/entities/order.entity";
import { CommentEntity } from "../../comment/entities/comment.entity";
import { ReviewEntity } from "../../reviews/entities/review.entity";
import { UserEntity } from "../../user/entities/user.entity";
import { TransactionEntity } from "src/transaction/entities/transaction.entity";

@Entity({ name: "employees" })
export class EmployeeEntity extends UserEntity {
  @Column()
  english_Name: string;

  @Column()
  arabic_Name: string;

  @Column({ nullable: true, default: 8 })
  workingHours: number;

  @Column({ length: 10 })
  countryCode: string;
  @Column({ length: 15 })
  phoneNumber: string;

  @Column()
  image: string;

  @Column({ nullable: true })
  speciality: string;

  @Column({ default: true })
  available: boolean;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @ManyToOne(
    () => EmployeeTypeEntity,
    (EmployeeTypeEntity) => EmployeeTypeEntity.employees,
  )
  employeeType: EmployeeTypeEntity;

  @Column({ default: 0 })
  totalReviews: number;

  @Column({ default: "working" })
  status: "working" | "completed";

  @ManyToOne(() => BranchEntity, (BranchEntity) => BranchEntity.employees, {
    onDelete: "SET NULL",
  })
  branch: BranchEntity;

  @ManyToOne(() => PositionEntity, (PositionEntity) => PositionEntity.employees)
  position: PositionEntity;

  @OneToMany(
    () => ReservationEntity,
    (ReservationEntity) => ReservationEntity.employee,
  )
  @JoinTable()
  reservations: ReservationEntity[];

  @OneToMany(() => OrderEntity, (OrderEntity) => OrderEntity.artist)
  orders: OrderEntity[];

  @OneToMany(() => CommentEntity, (CommentEntity) => CommentEntity.employee)
  comments: CommentEntity[];

  @OneToMany(() => ReviewEntity, (ReviewEntity) => ReviewEntity.employee)
  reviews: ReviewEntity[];

  @DeleteDateColumn({ name: "deleted_at", nullable: true })
  deletedAt?: Date;

  @Column({ default: false })
  isDeleted?: boolean;

  @Column({ type: "float", default: 0 })
  oldestAvgRating: number;

  @Column({ type: "float", default: 0 })
  newestAvgRating: number;
}