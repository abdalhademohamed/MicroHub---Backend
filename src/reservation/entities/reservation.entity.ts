import { ServiceEntity } from '../../service/entities/service.entity';
import { BranchEntity } from '../../branch/entities/branch.entity';
import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { EmployeeEntity } from '../../employee/entities/employee.entity';

@Entity() // Specify table name if necessary
export class ReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // @Column()
  // country_Code: string; // Correct property name

  @Column()
  phone_Number: string; // Correct property name

  @Column()
  client_FullName: string; // Correct property name

  @Column()
  day: number; // User's birthday day

  @Column()
  month: number; // User's birthday month

  @Column()
  year: number; // User's birthday year

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
 

  @Column({ type: 'text', nullable: true })
  deposit_Content: string; // Correct property name

  @ManyToOne(() => BranchEntity, (branch) => branch.reservations)
  branch: BranchEntity;

  @ManyToMany(() => ServiceEntity, (service) => service.reservations)
  services: ServiceEntity[]; // Handle multiple services
  // New relation to employees
  // @ManyToMany(() => EmployeeEntity, (EmployeeEntity) => EmployeeEntity.reservations)
  // employees: EmployeeEntity[];

  // @ManyToOne(() => EmployeeEntity, { nullable: true })
  // artist?: EmployeeEntity; // Ensure this relationship is defined
}
