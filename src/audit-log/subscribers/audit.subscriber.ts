import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent } from 'typeorm';
import { AuditLogEntity } from '../entities/audit.log.entity';
import { BranchEntity } from '../../branch/entities/branch.entity';
import { UserService } from '../../user/user.service';

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<BranchEntity> {

  constructor(
    private readonly UserService: UserService,
  ) {}
  listenTo() {
    // This will listen to all entities
    return undefined;
  }

  async afterInsert(event: InsertEvent<BranchEntity>) {
    const log = new AuditLogEntity();
    log.tableName = event.metadata.tableName;
    log.action = 'INSERT';
    log.entityId = event.entity.id;
    log.performedBy = event.entity.createdBy || null;

    if (event.entity.createdBy) {
      const user = await this.UserService.getUserDetails(event.entity.createdBy);
      log.userDetails = user;
    }

    await event.manager.save(log);
  }

  async afterUpdate(event: UpdateEvent<BranchEntity>) {
    const changedColumns = event.updatedColumns.map(column => column.propertyName);
    const changesDetails = {};

    // Collect old values from the database
    const oldEntity = await event.manager.findOne(BranchEntity, event.entity.id);

    // Determine changes
    changedColumns.forEach(column => {
      changesDetails[column] = {
        oldValue: oldEntity[column],
        newValue: event.entity[column],
      };
    });

    const log = new AuditLogEntity();
    log.tableName = event.metadata.tableName;
    log.action = 'UPDATE';
    log.entityId = event.entity.id;
    log.changedColumns = changedColumns;
    log.changesDetails = changesDetails;
    log.performedBy = event.entity.updatedBy || null;

    if (event.entity.updatedBy) {
      const user = await this.UserService.getUserDetails(event.entity.updatedBy);
      log.userDetails = user;
    }

    await event.manager.save(log);
  }

  async afterRemove(event: RemoveEvent<BranchEntity>) {
    const log = new AuditLogEntity();
    log.tableName = event.metadata.tableName;
    log.action = 'DELETE';
    log.entityId = event.entity.id;
    log.performedBy = event.entity.deletedBy || null;

    if (event.entity.deletedBy) {
      const user = await this.UserService.getUserDetails(event.entity.deletedBy);
      log.userDetails = user;
    }

    await event.manager.save(log);
  }
}
