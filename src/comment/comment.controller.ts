import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ApiQuery } from '@nestjs/swagger';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}


  @Get('sorted')
  async getComments(
    @Query('orderId') orderId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.commentService.getCommentsByOrderId(orderId, page, limit);
  }
}
