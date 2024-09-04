import { BranchEntity } from '../../branch/entities/branch.entity';
import { WeekDays } from '../../branch/utils/days.enum';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

@Entity()
export class WorkingBranchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: WeekDays,
  })
  dayOfWeek:WeekDays  // e.g., 'Monday', 'Tuesday', etc.

  @Column('simple-array')
  workingHours: string[];  // List of working hours like '09:00', '10:00'

  @ManyToOne(() => BranchEntity, (BranchEntity) => BranchEntity.workingbranch, { onDelete: 'CASCADE' })
  branch: BranchEntity;
}
