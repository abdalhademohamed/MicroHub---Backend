import { Module } from "@nestjs/common";
import { OfferService } from "./offer.service";
import { OfferController } from "./offer.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServiceEntity } from "../service/entities/service.entity";
import { OfferEntity } from "./entities/offer.entity";
import { BranchEntity } from "../branch/entities/branch.entity";
import { UserEntity } from "../user/entities/user.entity";
import { CustomI18nService } from "../common/custom.18n.service";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";


@Module({
  imports: [
    TypeOrmModule.forFeature([
      OfferEntity,
      ServiceEntity,
      BranchEntity,
      UserEntity,
      AuditLogEntity
    ]),
  ],
  controllers: [OfferController],
  providers: [
    OfferService,
    CustomI18nService,
  ],
  exports: [OfferService],
})
export class OfferModule {}
