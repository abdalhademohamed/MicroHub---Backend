import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { WorkingBranchEntity } from "../working-branch/entities/working.branch.entity";
import { BranchEntity } from "../branch/entities/branch.entity";
import { UserEntity } from "../user/entities/user.entity";
import { SlotController } from "./slot.controller";
import { SlotService } from "./slots.service";
import { ReservationModule } from "../reservation/reservation.module";
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
  exports: [SlotService], // Make the service available for other modules to use it.
})
export class SlotModule {}
