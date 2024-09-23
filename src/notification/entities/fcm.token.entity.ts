import { UserEntity } from "../../user/entities/user.entity";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { NotificationEntity } from "./notification.entity";

@Entity()
export class FcmTokenEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  userId: string;

  @Column()
  token: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamp", nullable: true, onUpdate: "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  // Many FCM Tokens can belong to one User
  @Column({ type: "timestamp", nullable: true })
  expiration: Date; // Adding expiration field

  @ManyToOne(() => UserEntity, (UserEntity) => UserEntity.fcmTokens)
  @JoinColumn({ name: "userId" })
  user: UserEntity;

  // One FCM Token can have many Notifications

  @OneToMany(
    () => NotificationEntity,
    (NotificationEntity) => NotificationEntity.fcmToken,
  )
  notifications: NotificationEntity[];
}
