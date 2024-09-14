import { ServiceEntity } from "../../service/entities/service.entity";
import { BranchEntity } from "../../branch/entities/branch.entity";
import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  ManyToMany,
  OneToMany,
} from "typeorm";
import { EmployeeEntity } from "../../employee/entities/employee.entity";
import { CustomerEntity } from "../../customer/entities/customer.entity";
import { OrderEntity } from "../../orders/entities/order.entity";

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
  services: ServiceEntity[]; // Handle multiple services
  // New relation to employees
  @ManyToMany(
    () => EmployeeEntity,
    (EmployeeEntity) => EmployeeEntity.reservations
  )
  employees: EmployeeEntity[];

  @ManyToOne(() => CustomerEntity, (customer) => customer.reservations)
  customer: CustomerEntity; // Relationship to CustomerEntity

  @OneToMany(() => OrderEntity, (OrderEntity) => OrderEntity.reservation)
  orders: OrderEntity[];


  @Column({ default: false })
  isDeleted: boolean;
}
