import { Module } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import { ReviewsController } from "./reviews.controller";
import { ReviewEntity } from "./entities/review.entity";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { OrderEntity } from "../orders/entities/order.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "../user/entities/user.entity";
import { UserService } from "../user/user.service";
import { UserModule } from "../user/user.module";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([ReviewEntity, EmployeeEntity, OrderEntity,UserEntity,AuditLogEntity]), // Add OrderEntity here
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
