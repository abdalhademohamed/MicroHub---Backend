import { OfferEntity } from '../../offer/entities/offer.entity';
import { EmployeeEntity } from '../../employee/entities/employee.entity';
import { ReservationEntity } from '../../reservation/entities/reservation.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToMany } from 'typeorm';
import { WorkingBranchEntity } from '../../working-branch/entities/working.branch.entity';
import { SlotsEntity } from 'src/slots/entities/slots.entity';

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


  // @Column()
  // periods: string[];  // List of time periods like '09:00', '10:00'
  @OneToMany(() => ReservationEntity, (ReservationEntity) => ReservationEntity.branch,{ cascade: ['insert', 'update'], onDelete: 'CASCADE' })  // Define the relationship
  reservations: ReservationEntity[];

  @OneToMany(() => EmployeeEntity, (EmployeeEntity) => EmployeeEntity.branch)
  employees: EmployeeEntity[];
  

  @ManyToMany(() => OfferEntity, (OfferEntity) => OfferEntity.branches)
  offers: OfferEntity[];

  @OneToMany(() => WorkingBranchEntity, (WorkingBranchEntity) => WorkingBranchEntity.branch, { cascade: true })
  workingbranch: WorkingBranchEntity[];
  @OneToMany( ()=> SlotsEntity, (entity) => entity.branch)
  slots: SlotsEntity[];

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @Column({ name: 'deleted_by', nullable: true })
  deletedBy: string;
}