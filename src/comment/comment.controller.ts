import { Controller, Get, Param, Query } from "@nestjs/common";
import { CommentService } from "./comment.service";

@Controller("comment")
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get(":orderId")
  async getComments(@Param("orderId") orderId: string) {
    return this.commentService.getCommentByOrderId(orderId);
  }
}
