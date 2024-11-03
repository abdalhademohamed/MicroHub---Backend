import { CommentResponseDto } from "./get.comments.response.dto";

export class PaginatedCommentResponseDto {
  items: CommentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
