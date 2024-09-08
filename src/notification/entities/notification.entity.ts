import { UserEntity } from "../../user/entities/user.entity";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { FcmTokenEntity } from "./fcm.token.entity";

@Entity()
export class NotificationEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column()
  message: string;

  // @Column({ nullable: true })
  // token?: string; // Make sure token is optional if it's not always required

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamp", nullable: true, onUpdate: "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  seenAt: Date; // Adding seen status

  @Column({ type: "varchar", length: 255, nullable: true })
  actionUrl?: string;
  // Many notifications can belong to one user
  @ManyToOne(() => UserEntity, (UserEntity) => UserEntity.notifications, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user: UserEntity;

  @ManyToOne(
    () => FcmTokenEntity,
    (FcmTokenEntity) => FcmTokenEntity.notifications
  )
  @JoinColumn({ name: "fcmTokenId" }) // Only necessary if you have a column for the foreign key
  fcmToken: FcmTokenEntity;
}
