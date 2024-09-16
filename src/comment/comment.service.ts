import { Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Between, Repository } from 'typeorm';
import { CommentEntity } from './entities/comment.entity';
import { InjectRepository } from '@nestjs/typeorm';

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

  async getComments(
    userId: string, 
    date: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<any> {
    // Calculate pagination offset
    const offset = (page - 1) * limit;
  
    // Format the date for comparison (assuming you are storing the date as a string or Date object)
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1); // To include the entire day
  
    // Find comments by userId and date with pagination
    const [comments, total] = await this.commentRepository.findAndCount({
      where: {
        employee: { id: userId },  // or order.artist.id based on your role
        createdAt: Between(startDate, endDate), // Assuming there's a 'createdAt' column
      },
      order: { createdAt: 'DESC' }, // Order by most recent comments
      skip: offset,
      take: limit,
      relations: ['order', 'employee'], // Include relations like 'order' or 'employee'
    });
  
    // Return paginated comments
    return {
      total,
      page,
      limit,
      comments,
    };
  }

}
