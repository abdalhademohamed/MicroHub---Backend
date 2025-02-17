import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class FileEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  type: string;

  @Column()
  link: string;

  @Column({ default: new Date() })
  createdAt: Date;
}
