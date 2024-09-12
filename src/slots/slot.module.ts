import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { WorkingBranchEntity } from "src/working-branch/entities/working.branch.entity";
import { BranchEntity } from "src/branch/entities/branch.entity";
import { UserEntity } from "src/user/entities/user.entity";
import { SlotController } from "./slot.controller";
import { SlotService } from "./slots.service";
import { ReservationModule } from "src/reservation/reservation.module";
import { SlotsEntity } from "./entities/slots.entity";
import { WorkingEntity } from "./entities/working.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SlotsEntity,
      WorkingEntity,
      WorkingBranchEntity,
      BranchEntity,
      UserEntity,
    ]), // Register the necessary entities with TypeORM
    ReservationModule,
  ],
  controllers: [SlotController], // Register the controller
  providers: [SlotService], // Register the service
})
export class SlotModule {}
