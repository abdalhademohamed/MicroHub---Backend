import { Controller, Get, Query } from "@nestjs/common";
import { CommentService } from "./comment.service";

@Controller("comment")
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get("sorted")
  async getComments(
    @Query("orderId") orderId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.commentService.getCommentsByOrderId(orderId, page, limit);
  }
}
