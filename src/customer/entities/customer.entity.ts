import { OrderEntity } from "../../orders/entities/order.entity";
import { ReservationEntity } from "../../reservation/entities/reservation.entity";
import { RootoshEntity } from "../../rootosh/entities/rootosh.entity";
import { ServiceEntity } from "../../service/entities/service.entity";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from "typeorm";

@Entity()
export class CustomerEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  country_Code: string;

  @Column({ length: 15 })
  phoneNumber: string;

  @Column()
  fullName: string;

  // @Column()
  // day: number;

  // @Column()
  // month: number;

  // @Column()
  // year: number;
  @Column({ type: "date", nullable: true }) // Adjust the type and nullable flag as needed
  dateOfBirth?: Date;

  @ManyToMany(() => ServiceEntity, (service) => service.customers, {
    cascade: ["insert", "update"],
    onDelete: "CASCADE",
  })
  @JoinTable() // This will create a join table
  lastServices: ServiceEntity[];

  @ManyToMany(() => RootoshEntity, (rootosh) => rootosh.customers, {
    cascade: ["insert", "update"],
    onDelete: "CASCADE",
  })
  @JoinTable() // This will create a join table
  lastRootoshes: RootoshEntity[];

  @OneToMany(
    () => ReservationEntity,
    (ReservationEntity) => ReservationEntity.customer,
  )
  reservations: ReservationEntity[]; // Relation to reservations

  @OneToMany(() => OrderEntity, (doc) => doc.customer)
  orders: OrderEntity[]; // Relation to reservations
}
