import { BranchEntity } from "../../branch/entities/branch.entity";
import { ServiceEntity } from "../../service/entities/service.entity";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  DeleteDateColumn,
} from "typeorm";

@Entity()
export class OfferEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  offerName: string;

 

  @Column({ type: "timestamp" })
  startDateTime: Date;

  @Column({ type: "timestamp" })
  endDateTime: Date;

  

  @Column({ type: "decimal", precision: 5, scale: 2 })
  discountPercentage: number;

  @Column({ type: "boolean", default: true })
  isActive: boolean; // New boolean column

  @ManyToMany(() => ServiceEntity)
  @JoinTable()
  services: ServiceEntity[];

  @ManyToMany(() => BranchEntity)
  @JoinTable()
  branches: BranchEntity[];
  // Add a soft delete column
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
