import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from "typeorm";
import { Role } from "../utils/user.enum";
import { NotificationEntity } from "../../notification/entities/notification.entity";
import { FcmTokenEntity } from "../../notification/entities/fcm.token.entity";
// import { BranchEntity } from "../../branch/entities/branch.entity";

@Entity()
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  otp: string;

  @Column({ nullable: true })
  otpExpiration: Date;

  // @ManyToMany(() => BranchEntity)
  // @JoinColumn({ name: "branchId" })
  // branch: BranchEntity;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({
    type: "enum",
    enum: Role,
    default: Role.ADMIN,
  })
  role: Role;

  @Column({ nullable: true })
  resetPasswordToken: string | null;

  @Column({ nullable: true })
  resetPasswordExpires: Date | null;

  // One user can have multiple notification devices (FCM tokens)
  @OneToMany(() => NotificationEntity, (notification) => notification.user, {
    cascade: true,
  })
  notifications: NotificationEntity[];

  @OneToMany(() => FcmTokenEntity, (FcmTokenEntity) => FcmTokenEntity.user)
  fcmTokens: FcmTokenEntity[];

  // Add a soft delete column
  @DeleteDateColumn({ name: "deleted_at", nullable: true })
  deletedAt?: Date;
}
