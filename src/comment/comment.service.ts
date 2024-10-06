import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

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
}
