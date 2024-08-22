import { ServiceEntity } from '../../service/entities/service.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

@Entity()
export class RootoshEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @ManyToOne(() => ServiceEntity, ServiceEntity => ServiceEntity.rootosh)
  service: ServiceEntity; // Link to the main service
}
