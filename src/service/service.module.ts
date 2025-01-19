import { Module } from "@nestjs/common";
import { ServiceService } from "./service.service";
import { ServiceController } from "./service.controller";
import { ServiceEntity } from "./entities/service.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { UserEntity } from "../user/entities/user.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { CustomI18nService } from "../common/custom.18n.service";
import { ExcelModule } from "src/excel/excel.module";

@Module({
  imports: [
    ExcelModule,
    TypeOrmModule.forFeature([ServiceEntity, UserEntity, AuditLogEntity]),
  ],
  controllers: [ServiceController],
  providers: [ServiceService, CloudinaryService, CustomI18nService],
})
export class ServiceModule {}
