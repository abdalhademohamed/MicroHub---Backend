import { Module } from "@nestjs/common";
import { PostionService } from "./postion.service";
import { PostionController } from "./postion.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PositionEntity } from "./entities/postion.entity";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { UserEntity } from "../user/entities/user.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { CustomI18nService } from "../common/custom.18n.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PositionEntity,
      EmployeeEntity,
      UserEntity,
      AuditLogEntity,
    ]),
  ],
  controllers: [PostionController],
  providers: [
    PostionService,
    CustomI18nService,
  ],
  exports: [PostionService],
})
export class PostionModule {}
