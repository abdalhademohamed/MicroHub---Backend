import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, ManyToMany, OneToMany } from 'typeorm';
import { BranchEntity } from '../../branch/entities/branch.entity';
import { PositionEntity } from '../../postion/entities/postion.entity';
import { EmployeeTypeEntity } from '../../employetype/entities/employetype.entity';
import { ReservationEntity } from '../../reservation/entities/reservation.entity';

@Entity()
export class EmployeeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  english_Name: string;

  @Column()
  arabic_Name: string;

  

  @Column()
  workingHours: string;  // Number of working hours

  @Column({ unique: true })
  email: string;  // Employee email

  @Column({ length: 10 })
  countryCode: string;  // Country code for the phone number

  @Column({ length: 15 })
  phoneNumber: string;  // Employee phone number

  @Column()
  password: string;  // Generated one-time password (OTP)

  @Column()
  image: string;  // Store the URL of the image uploaded to Cloudinary


  @Column({ default: true })
  available: boolean;  // Indicates if the employee is available or not
  
  @ManyToOne(() => EmployeeTypeEntity, (employeeType) => employeeType.employees)
  employeeType: EmployeeTypeEntity;

  @ManyToOne(() => BranchEntity, (branch) => branch.employees,{ onDelete: 'SET NULL' })
  branch: BranchEntity | string;

  @ManyToOne(() => PositionEntity, (position) => position.employees)
  position: PositionEntity | string;

  // @ManyToMany(() => ReservationEntity, (ReservationEntity) => ReservationEntity.employees)
  // reservations: ReservationEntity[];  // Add reservations relationship
  // @OneToMany(() => ReservationEntity, ReservationEntity => ReservationEntity.artist)
  // reservations: ReservationEntity[];
  
}