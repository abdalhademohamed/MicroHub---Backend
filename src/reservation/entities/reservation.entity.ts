import { ServiceEntity } from "../../service/entities/service.entity";
import { BranchEntity } from "../../branch/entities/branch.entity";
import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  OneToOne,
  JoinColumn,
  DeleteDateColumn,
} from "typeorm";
import { CustomerEntity } from "../../customer/entities/customer.entity";
import { OrderEntity } from "../../orders/entities/order.entity";
import { EmployeeEntity } from "../../employee/entities/employee.entity";
import { RootoshEntity } from "../../rootosh/entities/rootosh.entity";

@Entity() // Specify table name if necessary
export class ReservationEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  reservationDay: number; // Day of reservation

  @Column()
  reservationMonth: number; // Month of reservation

  @Column()
  reservationYear: number; // Year of reservation

  @Column({ type: "timestamp" })
  start_Time: Date;

  @Column({ type: "timestamp" })
  end_Time: Date;

  @Column({ type: "numeric", precision: 10, scale: 2, default: 0 })
  totalPrice: number; // Total price as a numeric value with 2 decimal places

  @Column({ type: "numeric", precision: 10, scale: 2, default: 0 })
  deposit: number; // Numeric value with 2 decimal places

  @Column({ default: new Date() })
  createdAt: Date;

  @Column({ nullable: true })
  deposit_Content: string; // Correct property name

  @ManyToOne(() => BranchEntity, (branch) => branch.reservations)
  branch: BranchEntity;

  @ManyToMany(() => ServiceEntity, (service) => service.reservations, {
    nullable: true,
  })
  services?: ServiceEntity[]; // Make it optional

  @ManyToOne(() => EmployeeEntity, (employee) => employee.reservations, {
    nullable: true,
  })
  @JoinColumn() // Indicates the owning side of the ManyToOne relationship
  employee: EmployeeEntity; // Optional, based on whether the employee can be null

  @ManyToOne(() => CustomerEntity, (customer) => customer.reservations)
  customer: CustomerEntity; // Relationship to CustomerEntity

  @ManyToMany(() => RootoshEntity, (rootosh) => rootosh.reservations, {
    nullable: true,
  })
  @JoinTable() // Required for Many-to-Many relationship
  rootoshes?: RootoshEntity[];

  @OneToOne(() => OrderEntity, (order) => order.reservation, { cascade: true })
  @JoinColumn() // Indicates the owning side of the OneToOne relationship
  order: OrderEntity;

  @DeleteDateColumn({ name: "deleted_at", nullable: true })
  deletedAt?: Date;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ name: "created_by", nullable: true })
  createdBy: string;
}