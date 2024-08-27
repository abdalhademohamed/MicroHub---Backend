import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BranchEntity } from '../../branch/entities/branch.entity';
import { PositionEntity } from '../../postion/entities/postion.entity';
import { EmployeeTypeEntity } from '../../employetype/entities/employetype.entity';

@Entity()
export class EmployeeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  english_Name: string;

  @Column()
  arabic_Name: string;

  @ManyToOne(() => EmployeeTypeEntity, (EmployeeTypeEntity) => EmployeeTypeEntity.employees)
  employeeType: EmployeeTypeEntity;


  @ManyToOne(() => BranchEntity, (BranchEntity) => BranchEntity.employees)
  branch: BranchEntity | string;

  @ManyToOne(() => PositionEntity, (PositionEntity) => PositionEntity.employees)
  position: PositionEntity |string;
}