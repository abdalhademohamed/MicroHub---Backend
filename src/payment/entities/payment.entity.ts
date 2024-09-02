import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  methodEnglish: string;

  @Column({ type: 'varchar', length: 255 })
  methodArabic: string;

  @Column({ type: 'varchar', length: 255 })
  image: string; // This will store the image URL or file path
}
