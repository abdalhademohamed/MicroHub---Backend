import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActionService } from "./action.service";
import { ActionController } from "./action.controller";
import { OrderEntity } from "src/orders/entities/order.entity";
import { ActionEntity } from "./entities/action.entity";
import { UserEntity } from "src/user/entities/user.entity";
import { BranchEntity } from "src/branch/entities/branch.entity";

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity, ActionEntity, UserEntity, BranchEntity])],
  controllers: [ActionController],
  providers: [ActionService],
  exports: [ActionService],
})
export class ActionModule {}