import { Injectable, InternalServerErrorException } from "@nestjs/common";

import { Between, Repository } from "typeorm";
import { CommentEntity } from "./entities/comment.entity";
import { InjectRepository } from "@nestjs/typeorm";


@Injectable()
export class CommentService {
  constructor(
    // @InjectRepository(OrderEntity)
    // private readonly orderRepository: Repository<OrderEntity>,

    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,

    // private readonly CloudinaryService: CloudinaryService,

    // @InjectRepository(EmployeeEntity)
    // private readonly employeeRepository: Repository<EmployeeEntity>
  ) {}
  async getCommentsByOrderId(
    orderId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    comments: CommentEntity[];
  }> {
    const offset = (page - 1) * limit;

    try {
      // Find comments by orderId with pagination
      const [comments, total] = await this.commentRepository.findAndCount({
        where: {
          order: { id: orderId }, // Filter by orderId
        },
        order: { createdAt: "DESC" }, // Order by most recent comments
        skip: offset,
        take: limit,
        relations: ["order", "employee"], // Include relations
      });

      // Return paginated comments
      return {
        total,
        page,
        limit,
        comments,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to retrieve comments",
        error.stack,
      );
    }
  }
}
