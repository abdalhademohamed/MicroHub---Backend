import { Controller, Get, Param, Query } from "@nestjs/common";
import { CommentService } from "./comment.service";
import { GetCommentsDto } from "./dto/get.comments.dto";
import { GetCommentsbycustomerDto } from "../orders/dto/get-comments.dto";
import { PaginatedCommentResponseDto } from "../orders/dto/paginated.comments.response.dto";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";

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
  @Get("customer/:customerId")
  async getCustomerComments(
    @Param("customerId") customerId: string,
    @Query() GetCommentsbycustomerDto: GetCommentsbycustomerDto,
  ) {
    return await this.commentService.getCustomerComments(
      customerId,
      GetCommentsbycustomerDto,
    );
  }

  @Get("artist/:artistId")
  @ApiOperation({ summary: "Get comments for a specific artist" })
  @ApiResponse({
    status: 200,
    description: "Returns paginated comments for the specified artist",
    type: PaginatedCommentResponseDto,
  })
  async getArtistComments(
    @Param("artistId") artistId: string,
    @Query() getCommentsDto: GetCommentsbycustomerDto,
  ): Promise<PaginatedCommentResponseDto> {
    return this.commentService.getArtistComments(artistId, getCommentsDto);
  }
}
