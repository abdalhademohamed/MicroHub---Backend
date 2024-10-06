import { Module } from "@nestjs/common";
import { RootoshService } from "./rootosh.service";
import { RootoshController } from "./rootosh.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RootoshEntity } from "./entities/rootosh.entity";
import { ServiceEntity } from "../service/entities/service.entity";
import { UserEntity } from "../user/entities/user.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RootoshEntity,
      ServiceEntity,
      UserEntity,
      AuditLogEntity,
    ]),
  ],

  controllers: [RootoshController],
  providers: [RootoshService],
})
export class RootoshModule {}
