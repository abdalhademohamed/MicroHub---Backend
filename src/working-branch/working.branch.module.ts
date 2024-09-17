import { Module } from "@nestjs/common";
import { WorkingBranchService } from "./working.branch.service";
import { WorkingBranchController } from "./working.branch.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BranchEntity } from "../branch/entities/branch.entity";
import { WorkingBranchEntity } from "./entities/working.branch.entity";
import { SlotModule } from "src/slots/slot.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([BranchEntity, WorkingBranchEntity]),
    SlotModule,
  ],
  controllers: [WorkingBranchController],
  providers: [WorkingBranchService],
})
export class WorkingBranchModule {}