import { BranchEntity } from "src/branch/entities/branch.entity";
import {
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Entity,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { WorkingEntity } from "./working.entity";
// 10/09/2024
@Entity()
export class SlotsEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  day: number;
  
  @Column()
  month: number;

  @Column() 
  year: number;
 
  @ManyToOne(() => BranchEntity, (entity) => entity.slots )
  @JoinColumn({ name: "branchId" })
  branch: BranchEntity;
 
  @OneToMany(() => WorkingEntity, (entity) => entity.slot)
  workingEntity: WorkingEntity[];

}
