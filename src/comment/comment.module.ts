import { Module } from "@nestjs/common";
import { CommentService } from "./comment.service";
import { CommentController } from "./comment.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommentEntity } from "./entities/comment.entity";
import { CustomI18nService } from "../common/custom.18n.service";

@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity])],
  controllers: [CommentController],
  providers: [
    CommentService,
    CustomI18nService,
  ],
  exports: [CommentService],
})
export class CommentModule {}
