import { ServiceEntity } from '../../service/entities/service.entity';
import { BranchEntity } from '../../branch/entities/branch.entity';
import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';

@Entity() // Specify table name if necessary
export class ReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  country_Code: string; // Correct property name

  @Column()
  phone_Number: string; // Correct property name

  @Column()
  client_FullName: string; // Correct property name

  @Column()
  day: number;

  @Column()
  month: number;

  @Column()
  year: number;

  @Column('time')
  reservation_Time_From: string;

  @Column('time')
  reservation_Time_To: string;

  @Column({ type: 'text', nullable: true })
  deposit_Content: string; // Correct property name

  @ManyToOne(() => BranchEntity, (branch) => branch.reservations)
  branch: BranchEntity;

  @ManyToMany(() => ServiceEntity, (service) => service.reservations)
  services: ServiceEntity[]; // Handle multiple services
}
