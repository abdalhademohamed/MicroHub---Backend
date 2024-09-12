import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  ManyToMany,
  OneToMany,
} from "typeorm";
import { BranchEntity } from "../../branch/entities/branch.entity";
import { PositionEntity } from "../../postion/entities/postion.entity";
import { EmployeeTypeEntity } from "../../employetype/entities/employetype.entity";
import { ReservationEntity } from "../../reservation/entities/reservation.entity";
import { OrderEntity } from "../../orders/entities/order.entity";
import { CommentEntity } from "../../comment/entities/comment.entity";
import { ReviewEntity } from "../../reviews/entities/review.entity";

@Entity()
export class EmployeeEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  english_Name: string;

  @Column()
  arabic_Name: string;

  @Column()
  workingHours: string; // Number of working hours

  @Column({ unique: true })
  email: string; // Employee email

  @Column({ length: 10 })
  countryCode: string; // Country code for the phone number

  @Column({ length: 15 })
  phoneNumber: string; // Employee phone number

  @Column()
  password: string; // Generated one-time password (OTP)

  @Column()
  image: string; // Store the URL of the image uploaded to Cloudinary

  @Column({ default: true })
  available: boolean; // Indicates if the employee is available or not

  @ManyToOne(() => EmployeeTypeEntity, (EmployeeTypeEntity) => EmployeeTypeEntity.employees)
  employeeType: EmployeeTypeEntity;
  @Column({ default: 0 })
  totalReviews: number; // Total number of reviews for the employee

  @Column({ default: 'working' })
  status: 'working' | 'completed'; // Status of the employee
  
  @ManyToOne(() => BranchEntity, (BranchEntity) => BranchEntity.employees, {
    onDelete: "SET NULL",
  })
  branch: BranchEntity 

  @ManyToOne(() => PositionEntity, (PositionEntity) => PositionEntity.employees)
  position: PositionEntity 
  @ManyToMany(() => ReservationEntity, (ReservationEntity) => ReservationEntity.employees)
  reservations: ReservationEntity[];
  // @OneToMany(() => ReservationEntity, ReservationEntity => ReservationEntity.artist)
  // reservations: ReservationEntity[];

  @OneToMany(() => OrderEntity, (OrderEntity) => OrderEntity.artist)
  orders: OrderEntity[];

  @OneToMany(() => CommentEntity, (CommentEntity) => CommentEntity.employee)
  comments: CommentEntity[]; // Comments made by the employee

  @OneToMany(() => ReviewEntity, (ReviewEntity) => ReviewEntity.employee)
  reviews: ReviewEntity[]; // Reviews made by the employee
}
