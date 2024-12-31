import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActionService } from "./action.service";
import { ActionController } from "./action.controller";
import { OrderEntity } from "../orders/entities/order.entity";
import { ActionEntity } from "./entities/action.entity";
import { UserEntity } from "../user/entities/user.entity";
import { BranchEntity } from "../branch/entities/branch.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      ActionEntity,
      UserEntity,
      BranchEntity,
    ]),
  ],
  controllers: [ActionController],
  providers: [ActionService],
  exports: [ActionService],
})
export class ActionModule {}
