import { BranchEntity } from "../../branch/entities/branch.entity";
import { ServiceEntity } from "../../service/entities/service.entity";
import { CustomerEntity } from "../../customer/entities/customer.entity"; // Assuming you have a customer entity
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  ManyToOne,
  OneToMany,
  DeleteDateColumn,
} from "typeorm";
import { GiftCouponEntity } from "../../gift-coupon/entities/gift-coupon.entity";

@Entity()
export class SharableOfferEntity {
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

  @ManyToMany(() => ServiceEntity)
  @JoinTable()
  services: ServiceEntity[];

  @ManyToMany(() => BranchEntity, (branch) => branch.sharableOffers) // Set as Many-to-Many relation
  @JoinTable()
  branches: BranchEntity[];

  // Relation to the gift coupons associated with this sharable offer
  @OneToMany(() => GiftCouponEntity, (coupon) => coupon.sharableOffer)
  giftCoupons: GiftCouponEntity[];

  @Column({ type: "boolean", default: true })
  isActive: boolean; // Indicates if the offer is still active

  @DeleteDateColumn({ name: "deleted_at", nullable: true })
  deletedAt?: Date;

  // Add a new column to track how many times the offer has been used
  @Column({ type: "int", default: 0 }) // Default to 0 initially
  usageCount: number;
}
