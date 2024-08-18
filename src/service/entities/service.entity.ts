// import { ReservationEntity } from '../../reservation/entities/reservation.entity';
import { UUID } from 'crypto';
import { ReservationEntity } from '../../reservation/entities/reservation.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { RootoshEntity } from '../../rootosh/entities/rootosh.entity';



@Entity()
export class ServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  imageUrl: string;

  @Column()
  arabic_Name: string;

  @Column()
  english_Name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('int')
  duration_Mins: number;

  @Column('int')
  rootosh_Number: number;

  @Column('int')
  months_To_Expire: number;


  @ManyToMany(() => ReservationEntity, ReservationEntity => ReservationEntity.services)
  @JoinTable()
  reservations: ReservationEntity[];


  @OneToMany(() => RootoshEntity, RootoshEntity => RootoshEntity.service)
  rootosh: RootoshEntity[]; // Include rootoshes with the service
}