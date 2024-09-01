import { OfferEntity } from '../../offer/entities/offer.entity';
import { EmployeeEntity } from '../../employee/entities/employee.entity';
import { ReservationEntity } from '../../reservation/entities/reservation.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToMany } from 'typeorm';

@Entity()
export class BranchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  location: string;  // Ensure this is not nullable

  @Column()
  image: string;  // Store the URL of the image uploaded to Cloudinary

  @OneToMany(() => ReservationEntity, (ReservationEntity) => ReservationEntity.branch,{ cascade: ['insert', 'update'], onDelete: 'CASCADE' })  // Define the relationship
  reservations: ReservationEntity[];

  @OneToMany(() => EmployeeEntity, (EmployeeEntity) => EmployeeEntity.branch)
  employees: EmployeeEntity[];
  

  @ManyToMany(() => OfferEntity, (OfferEntity) => OfferEntity.branches)
  offers: OfferEntity[];
}