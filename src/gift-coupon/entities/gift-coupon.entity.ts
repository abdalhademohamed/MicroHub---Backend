import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CustomerEntity } from "../../customer/entities/customer.entity";
import { SharableOfferEntity } from "../../sharable-offer/entities/sharable-offer.entity";

@Entity()
export class GiftCouponEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  couponCode: string; // Unique code for the gift coupon

  @Column({ type: "boolean", default: false })
  isRedeemed: boolean; // Indicates whether the coupon has been redeemed

  @Column({ type: "timestamp", nullable: true })
  redeemedAt: Date; // When the coupon was redeemed

  // Many coupons can be tied to one sharable offer
  @ManyToOne(
    () => SharableOfferEntity,
    (SharableOfferEntity) => SharableOfferEntity.giftCoupons,
    { onDelete: "CASCADE" }
  )
  @JoinColumn({ name: "sharableOfferId" })
  sharableOffer: SharableOfferEntity;

  // Customer who gifted the coupon
  @ManyToOne(() => CustomerEntity, (customer) => customer.receivedCoupons)
  @JoinColumn({ name: "ownerId" })
  ownedBy: CustomerEntity;

  @Column({ type: "int", default: 0 })
  totalServices: number; // Total number of services in the package

  @Column({ type: "int", default: 0 })
  usedServices: number; // Number of services already used by the customer

  @Column({ type: "int", default: 0 })
  giftedServices: number; // Number of services given away as gift coupons

  // List of services from the sharable offer
  // List of services from the sharable offer
  @Column("jsonb", { nullable: true })
  services: {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string; // Add additional fields from your JSON as necessary
    arabic_Name: string;
    english_Name: string;
    duration_Mins: number;
    rootosh_Number: number;
    months_To_Expire: number;
  }[]; // List of services associated with this coupon
  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date; // When the coupon was created

  // New fields for the validity period of the coupon
  @Column({ type: "timestamp", nullable: true })
  startDateTime: Date; // Start date and time for the coupon validity

  @Column({ type: "timestamp", nullable: true })
  endDateTime: Date; // End date and time for the coupon validity

  @Column('jsonb', { nullable: true, default: [] })
  usageHistory: {
    customer: {
      id: string;
      name: string;
      phoneNumber: string;
   
    };
    services: {
      id: string;
      arabic_Name: string;
      english_Name: string;
    }[];
    usedAt: Date;
  }[];



  @Column('jsonb', { nullable: true, default: [] })
  servicesReservationStatus: {
    serviceId: string;
    serviceArabicName: string,
    serviceEnglishName: string,
    isReserved: boolean;
    reservedAt: Date

  }[];
}
