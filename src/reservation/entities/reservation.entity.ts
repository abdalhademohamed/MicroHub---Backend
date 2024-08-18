import { ServiceEntity } from '../../service/entities/service.entity';
import { BranchEntity } from '../../branch/entities/branch.entity';
import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';

@Entity() // Specify table name if necessary
export class ReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Column()
  clientCode: string;

  @Column()
  phoneNumber: string;

  @Column()
  clientFullName: string;

  @Column()
  day: number;

  @Column()
  date: string;

  @Column()
  month: number;

  

  @Column('time')
  reservationTimeFrom: string;

  @Column('time')
  reservationTimeTo: string;
  @ManyToOne(() => BranchEntity, (branch) => branch.reservations)
  branch: BranchEntity;
  
  @ManyToMany(() => ServiceEntity, ServiceEntity => ServiceEntity.reservations)
  services: ServiceEntity[]; // Updated to handle multiple services
}
