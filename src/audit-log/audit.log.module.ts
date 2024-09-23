import { Module } from "@nestjs/common";
import { AuditLogService } from "./audit.log.service";
import { AuditLogController } from "./audit.log.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLogEntity } from "./entities/audit.log.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLogEntity]), // Register audit log entity for other modules
  ],
  controllers: [AuditLogController],
  providers: [AuditLogService],
})
export class AuditLogModule {}
