import { EmployeeEntity } from '../../employee/entities/employee.entity';
import { ReservationEntity } from '../../reservation/entities/reservation.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity()
export class BranchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  location: string;  // Ensure this is not nullable

  @Column()
  imageUrl: string;  // Store the URL of the image uploaded to Cloudinary

  @OneToMany(() => ReservationEntity, (ReservationEntity) => ReservationEntity.branch)  // Define the relationship
  reservations: ReservationEntity[];

  @OneToMany(() => EmployeeEntity, (EmployeeEntity) => EmployeeEntity.branch)
  employees: EmployeeEntity[];
  
}