import { Controller, Get, Param, Query } from "@nestjs/common";
import { CommentService } from "./comment.service";
import { GetCommentsDto } from "./dto/get.comments.dto";

@Controller("comment")
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get(":orderId")
  async getComment(@Param("orderId") orderId: string) {
    return this.commentService.getCommentByOrderId(orderId);
  }


  @Get()
  async getComments(@Query() dto: GetCommentsDto) {
    return this.commentService.getComments(dto);
  }
}
