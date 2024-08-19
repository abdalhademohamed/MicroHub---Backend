import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BranchEntity } from '../../branch/entities/branch.entity';
import { PositionEntity } from '../../postion/entities/postion.entity';

@Entity()
export class EmployeeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  english_Name: string;

  @Column()
  arabic_Name: string;

  @Column()
  employee_Type_English: string;

  @Column()
  employee_Type_Arabic: string;

  @ManyToOne(() => BranchEntity, (BranchEntity) => BranchEntity.employees)
  branch: BranchEntity | string;

  @ManyToOne(() => PositionEntity, (PositionEntity) => PositionEntity.employees)
  position: PositionEntity |string;
}