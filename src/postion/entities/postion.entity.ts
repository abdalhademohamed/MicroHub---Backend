import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { EmployeeEntity } from '../../employee/entities/employee.entity';
import { Postion } from '../utils/postion.enum';



@Entity()
export class PositionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: Postion,
  })
  role: Postion;

  @Column()
  positionInEnglish: string;

  @Column()
  positionInArabic: string;

  @OneToMany(() => EmployeeEntity, (EmployeeEntity) => EmployeeEntity.position)
  employees: EmployeeEntity[];
}
