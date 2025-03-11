import { Module } from "@nestjs/common";
import { WorkingBranchService } from "./working.branch.service";
import { WorkingBranchController } from "./working.branch.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BranchEntity } from "../branch/entities/branch.entity";
import { WorkingBranchEntity } from "./entities/working.branch.entity";
import { SlotModule } from "../slots/slot.module";
import { ReservationEntity } from "src/reservation/entities/reservation.entity";
import { CustomI18nService } from "src/common/custom.18n.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BranchEntity,
      WorkingBranchEntity,
      ReservationEntity,
    ]),
    SlotModule,
  ],
  controllers: [WorkingBranchController],
  providers: [WorkingBranchService, CustomI18nService],
})
export class WorkingBranchModule {}
