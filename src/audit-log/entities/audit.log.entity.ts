import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('audit_log_entity')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'table_name' })
  tableName: string;

  @Column()
  action: string; // 'INSERT', 'UPDATE', 'DELETE'

  @Column({ name: 'entity_id' })
  entityId: string; // The ID of the entity affected

  @Column({ type: 'jsonb', nullable: true })
  changedColumns: string[]; // List of fields that were updated

  @Column({ name: 'performed_by'})
  performedBy: string; // The user who performed the action

  @Column('jsonb')
  userDetails: any;  // This should be defined as a JSONB field
  @Column({ type: 'json', nullable: true })
  changesDetails: Record<string, { oldValue: any, newValue: any }>; // Detailed change info


  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date; // Automatically sets the timestamp
}
