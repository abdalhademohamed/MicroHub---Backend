import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ApiQuery } from '@nestjs/swagger';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}


  @Get()
  @ApiQuery({ name: 'userId', required: true, type: String, example: '123' })
  @ApiQuery({ name: 'date', required: true, type: String, example: '2023-09-12' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getComments(
    @Query('userId') userId: string,
    @Query('date') date: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ): Promise<any> {
    // Validate query parameters
    if (page < 1) {
      throw new BadRequestException('Page must be greater than or equal to 1');
    }
    if (limit < 1) {
      throw new BadRequestException('Limit must be greater than or equal to 1');
    }
    
    return this.commentService.getComments(userId, date, page, limit);
  }
}
