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
import { NotificationModule } from "../notification/notification.module";
import { CustomI18nService } from "../common/custom.18n.service";
import { CommentEntity } from "../comment/entities/comment.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReviewEntity,
      EmployeeEntity,
      OrderEntity,
      UserEntity,
      AuditLogEntity,
      CommentEntity,
    ]), // Add OrderEntity here
    NotificationModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService, CustomI18nService],
})
export class ReviewsModule {}
