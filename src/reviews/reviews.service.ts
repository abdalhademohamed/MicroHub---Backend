import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create.review.dto';
import { UpdateReviewDto } from './dto/update.review.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ReviewEntity } from './entities/review.entity';
import { EmployeeEntity } from '../employee/entities/employee.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { Repository } from 'typeorm';
import { GetReviewsDto } from './dto/get.reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewRepository: Repository<ReviewEntity>,

    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,

    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
  ) {}

  async createReview(createReviewDto: CreateReviewDto): Promise<ReviewEntity> {
    const { newestReviews, employeeId, orderId } = createReviewDto;

    // Check if the employee exists and is an artist
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee || !employee.employeeType || employee.employeeType.typeEnglish !== 'Artist') {
      throw new NotFoundException(`Employee with ID ${employeeId} is not an artist or not found`);
    }

    // Check if the order exists and belongs to the employee
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order || order.artist?.id !== employeeId) {
      throw new NotFoundException(`Order with ID ${orderId} not found or does not belong to the employee`);
    }

    // Create the review
    const review = this.reviewRepository.create({
      newestReviews, // Assign the rating to newestReviews
      employee,
      order,
    });

    try {
      return await this.reviewRepository.save(review);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create review', error.stack);
    }
  }


  async getAllReviews({
    page = 1,
    limit = 10,
    sort = 'asc',
  }: GetReviewsDto): Promise<{ reviews: ReviewEntity[]; total: number }> {
    try {
      const query = this.reviewRepository.createQueryBuilder('review')
        .leftJoinAndSelect('review.order', 'order') // If you need order details
        .leftJoinAndSelect('review.employee', 'employee') // If you need employee details
        .take(limit)
        .skip((page - 1) * limit)
        .orderBy('review.createdAt', sort.toUpperCase() as 'ASC' | 'DESC');

      const [reviews, total] = await query.getManyAndCount();

      return { reviews, total };

    } catch (error) {
      throw new InternalServerErrorException('Failed to get reviews', error.stack);
    }
  }



  async getReviewsForArtist(employeeId: string): Promise<ReviewEntity[]> {
    try {
      // Check if the employee exists and is an artist
      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
      });

      if (!employee || !employee.employeeType || employee.employeeType.typeEnglish !== 'ARTIST') {
        throw new NotFoundException(`Employee with ID ${employeeId} is not an artist or not found`);
      }

      // Retrieve reviews for the artist
      const reviews = await this.reviewRepository.find({
        where: { employee: { id: employeeId } }, // Correctly reference employee
        relations: ['order'], // If you need to include order details
      });

      return reviews;
    } catch (error) {
      throw new InternalServerErrorException('Failed to get reviews for artist', error.stack);
    }
  }



  async getReviewsForCurrentUser(userId: string): Promise<ReviewEntity[]> {
    try {
      // Check if the employee exists and is an artist
      const employee = await this.employeeRepository.findOne({
        where: { id: userId },
      });

      if (!employee || !employee.employeeType || employee.employeeType.typeEnglish !== 'ARTIST') {
        throw new NotFoundException(`Employee with ID ${userId} is not an artist or not found`);
      }

      // Retrieve reviews for the employee
      const reviews = await this.reviewRepository.find({
        where: { employee: { id: userId } }, // Correctly reference employee
        relations: ['order'], // If you need to include order details
      });

      return reviews;
    } catch (error) {
      throw new InternalServerErrorException('Failed to get reviews for the current user', error.stack);
    }
  }
}
