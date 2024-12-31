import { ReservationEntity } from "../../reservation/entities/reservation.entity";
import { CustomerEntity } from "../../customer/entities/customer.entity";
import { ServiceEntity } from "../../service/entities/service.entity";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
} from "typeorm";

@Entity()
export class RootoshEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  arabic_Name: string;

  @Column()
  english_Name: string;

  // New field to store the duration until expiration (in days, for example)
  @Column({ nullable: true })
  expireduration: number; // Duration in days, weeks, etc.

  @Column("int")
  duration_Mins: number;

  @Column()
  description: string;

  @ManyToOne(() => ServiceEntity, (ServiceEntity) => ServiceEntity.rootosh)
  service: ServiceEntity; // Link to the main service

  @ManyToMany(() => CustomerEntity, (customer) => customer.lastRootoshes)
  customers: CustomerEntity[];

  @ManyToMany(() => ReservationEntity, (reservation) => reservation.rootoshes)
  reservations?: ReservationEntity[]; // Optional relationship to ReservationEntity
}
