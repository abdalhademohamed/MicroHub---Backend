import { RootoshEntity } from '../../rootosh/entities/rootosh.entity';
import { ServiceEntity } from '../../service/entities/service.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm';

@Entity() 
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  country_Code: string;

  @Column({ length: 15 })
  phoneNumber: string;

  @Column()
  fullName: string;

  @Column()
  day: number;

  @Column()
  month: number;

  @Column()
  year: number;




  @ManyToMany(() => ServiceEntity, service => service.customers,{ cascade: ['insert', 'update'], onDelete: 'CASCADE' })
  @JoinTable() // This will create a join table
  lastServices: ServiceEntity[];

  @ManyToMany(() => RootoshEntity, rootosh => rootosh.customers,{ cascade: ['insert', 'update'], onDelete: 'CASCADE' })
  @JoinTable() // This will create a join table
  lastRootoshes: RootoshEntity[];
}
