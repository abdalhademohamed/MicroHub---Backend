import { ServiceEntity } from '../../service/entities/service.entity';
import { BranchEntity } from '../../branch/entities/branch.entity';
import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, ManyToMany, OneToMany } from 'typeorm';
import { EmployeeEntity } from '../../employee/entities/employee.entity';
import { CustomerEntity } from '../../customer/entities/customer.entity';
import { OrderEntity } from '../../orders/entities/order.entity';

@Entity() // Specify table name if necessary
export class ReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // @Column({ type: 'varchar', nullable: true }) // Ensure nullable is set if the column can have NULL values
  // country_Code: string;

  // @Column()
  // phone_Number: string; // Correct property name

  // @Column()
  // client_FullName: string; // Correct property name

  // @Column()
  // day: number; // User's birthday day

  // @Column()
  // month: number; // User's birthday month

  // @Column()
  // year: number; // User's birthday year


  // @Column({ type: 'date' })
  // dateOfBirth: string; // Format: YYYY-MM-DD
  
  @Column()
  reservationDay: number; // Day of reservation
  @Column()
  reservationMonth: number; // Month of reservation
  @Column()
  reservationYear: number; // Year of reservation

  @Column({ type: 'timestamp' })
  start_Time: Date;

  @Column({ type: 'timestamp' })
  end_Time: Date;
 
  @Column({ type: 'number'})
  totalPrice: number;

  @Column({ type: 'number' })
  deposit: number;
  @Column()
  deposit_Content: string; // Correct property name

  @ManyToOne(() => BranchEntity, (branch) => branch.reservations)
  branch: BranchEntity;

  @ManyToMany(() => ServiceEntity, (service) => service.reservations)
  services: ServiceEntity[]; // Handle multiple services
  // New relation to employees
  @ManyToMany(() => EmployeeEntity, (EmployeeEntity) => EmployeeEntity.reservations)
  employees: EmployeeEntity[];

  
  @ManyToOne(() => CustomerEntity, customer => customer.reservations)
  customer: CustomerEntity; // Relationship to CustomerEntity


  @OneToMany(() => OrderEntity, OrderEntity => OrderEntity.reservation)
  orders: OrderEntity[];
}
