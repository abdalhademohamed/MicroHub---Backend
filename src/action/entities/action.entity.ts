import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Column,
} from "typeorm";
import { UserEntity } from "../../user/entities/user.entity";
import { BranchEntity } from "../../branch/entities/branch.entity";

@Entity()
export class ActionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  actionAr: string;

  @Column({ nullable: true })
  actionEn: string;

  @ManyToOne(() => UserEntity)
  createdBy: UserEntity;

  @Column({ nullable: true })
  order: string;

  @ManyToOne(() => BranchEntity)
  branch: BranchEntity;

  @CreateDateColumn()
  createdAt: Date; // Automatically set when the entity is created
}
