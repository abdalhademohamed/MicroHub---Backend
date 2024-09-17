import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { SlotsEntity } from "./slots.entity";

@Entity()
export class WorkingEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  from: Date;
  @Column()
  to: Date;

  @ManyToOne(() => SlotsEntity, (entity) => entity.workingEntity, { onDelete: 'CASCADE'})
  @JoinColumn({ name: "slotId" })
  slot: SlotsEntity;

  @Column()
  duration: number;
}