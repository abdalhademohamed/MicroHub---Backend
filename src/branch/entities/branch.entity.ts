import { OfferEntity } from "../../offer/entities/offer.entity";
import { EmployeeEntity } from "../../employee/entities/employee.entity";
import { ReservationEntity } from "../../reservation/entities/reservation.entity";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  DeleteDateColumn,
} from "typeorm";
import { WorkingBranchEntity } from "../../working-branch/entities/working.branch.entity";
import { SlotsEntity } from "../../slots/entities/slots.entity";
import { SharableOfferEntity } from "../../sharable-offer/entities/sharable-offer.entity";

@Entity()
export class BranchEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column()
  location: string;

  @Column()
  image: string;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @DeleteDateColumn({ name: "deleted_at", nullable: true })
  deletedAt?: Date;

  @OneToMany(
    () => ReservationEntity,
    (ReservationEntity) => ReservationEntity.branch,
    { cascade: ["insert", "update"], onDelete: "CASCADE" },
  )
  reservations: ReservationEntity[];

  @OneToMany(() => EmployeeEntity, (EmployeeEntity) => EmployeeEntity.branch)
  employees: EmployeeEntity[];

  @ManyToMany(() => OfferEntity, (OfferEntity) => OfferEntity.branches)
  offers: OfferEntity[];

  @OneToMany(
    () => WorkingBranchEntity,
    (WorkingBranchEntity) => WorkingBranchEntity.branch,
    { cascade: true },
  )
  workingbranch: WorkingBranchEntity[];

  @OneToMany(() => SlotsEntity, (entity) => entity.branch)
  slots: SlotsEntity[];

  @ManyToMany(
    () => SharableOfferEntity,
    (SharableOfferEntity) => SharableOfferEntity.branches,
  )
  sharableOffers: SharableOfferEntity[];

  @Column({ name: "created_by", nullable: true })
  createdBy: string;

  @Column({ name: "updated_by", nullable: true })
  updatedBy: string;

  @Column({ name: "deleted_by", nullable: true })
  deletedBy: string;
}