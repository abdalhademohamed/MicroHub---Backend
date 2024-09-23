import { ServiceEntity } from "../../service/entities/service.entity";
import { BranchEntity } from "../../branch/entities/branch.entity";
import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  ManyToMany,
  OneToMany,
  JoinTable,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { CustomerEntity } from "../../customer/entities/customer.entity";
import { OrderEntity } from "../../orders/entities/order.entity";
import { EmployeeEntity } from "../../employee/entities/employee.entity";

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

  @Column()
  deposit_Content: string; // Correct property name

  @ManyToOne(() => BranchEntity, (branch) => branch.reservations)
  branch: BranchEntity;

  @ManyToMany(() => ServiceEntity, (service) => service.reservations)
  services: ServiceEntity[];

  @ManyToMany(() => EmployeeEntity, (employee) => employee.reservations)
  employees: EmployeeEntity[];

  @ManyToOne(() => CustomerEntity, (customer) => customer.reservations)
  customer: CustomerEntity; // Relationship to CustomerEntity

  @OneToOne(() => OrderEntity, (order) => order.reservation, { cascade: true })
  @JoinColumn() // Indicates the owning side of the OneToOne relationship
  order: OrderEntity;

  @Column({ default: false })
  isDeleted: boolean;
}
