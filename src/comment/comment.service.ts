import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import { Between, Repository } from "typeorm";
import { CommentEntity } from "./entities/comment.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { GetCommentsDto } from "./dto/get.comments.dto";

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
  async getCommentByOrderId(orderId: string): Promise<CommentEntity | null> {
    try {
      // Find the comment by orderId
      const comment = await this.commentRepository.findOne({
        where: {
          order: { id: orderId },
        },
        relations: ["order", "employee"], // Include relations
      });

      // Return null if no comment exists for this order
      if (!comment) {
        return null;
      }

      // Manually map the employee fields to include only what you need
      const employee = comment.employee
        ? {
            id: comment.employee.id,
            username: comment.employee.username,
            email: comment.employee.email,
            role: comment.employee.role,
            english_Name: comment.employee.english_Name,
            arabic_Name: comment.employee.arabic_Name,
            workingHours: comment.employee.workingHours,
            phoneNumber: comment.employee.phoneNumber,
            image: comment.employee.image,
            available: comment.employee.available,
            totalReviews: comment.employee.totalReviews,
            status: comment.employee.status,
            oldestAvgRating: comment.employee.oldestAvgRating,
            newestAvgRating: comment.employee.newestAvgRating,
          }
        : null;

      // Return the comment with the mapped employee
      return {
        ...comment,
        employee, // Use the mapped employee here
      };
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to retrieve comment",
        error.stack,
      );
    }
  }




  async getComments(dto: GetCommentsDto) {
    const { fromDate, toDate, page, limit } = dto;

    const query = this.commentRepository.createQueryBuilder('comment')
      .leftJoinAndSelect('comment.order', 'order')
      .leftJoinAndSelect('comment.employee', 'employee')
      .orderBy('comment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // Apply date filtering if fromDate and toDate are provided
    if (fromDate) {
      query.andWhere('comment.createdAt >= :fromDate', { fromDate });
    }
    if (toDate) {
      query.andWhere('comment.createdAt <= :toDate', { toDate });
    }

    // Execute the query and return results
    const [comments, total] = await query.getManyAndCount();

    return {
      comments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
