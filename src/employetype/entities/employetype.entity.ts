import { EmployeeEntity } from '../../employee/entities/employee.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity()
export class EmployeeTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  typeEnglish: string;

  @Column({ type: 'varchar', length: 255 })
  typeArabic: string;

  @OneToMany(() => EmployeeEntity, (EmployeeEntity) => EmployeeEntity.employeeType)
  employees: EmployeeEntity[];
}
