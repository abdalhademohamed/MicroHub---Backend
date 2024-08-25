import { RootoshEntity } from 'src/rootosh/entities/rootosh.entity';
import { ServiceEntity } from 'src/service/entities/service.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable } from 'typeorm';

@Entity() 
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 10 })
  countryCode: string;

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


   // Last services and rootoshes
   @ManyToMany(() => ServiceEntity, { cascade: true })
   lastServices: ServiceEntity[];
 
   @ManyToMany(() => RootoshEntity, { cascade: true })
   lastRootoshes: RootoshEntity[];
}
