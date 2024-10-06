import { Module } from "@nestjs/common";
import { ServiceService } from "./service.service";
import { ServiceController } from "./service.controller";
import { ServiceEntity } from "./entities/service.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { UserEntity } from "../user/entities/user.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceEntity, UserEntity, AuditLogEntity]),
  ],
  controllers: [ServiceController],
  providers: [ServiceService, CloudinaryService],
})
export class ServiceModule {}
