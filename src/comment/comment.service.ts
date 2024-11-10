import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import { Between, Repository } from "typeorm";
import { CommentEntity } from "./entities/comment.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { GetCommentsDto } from "./dto/get.comments.dto";
import {
  CommentResponseDto,
  ReviewResponseDto,
} from "./dto/get.comment.response.dto";
import { CustomI18nService } from "../common/custom.18n.service";
import { PaginatedCommentResponseDto } from "../orders/dto/paginated.comments.response.dto";
import { GetCommentsbycustomerDto } from "../orders/dto/get-comments.dto";

@Injectable()
export class CommentService {
  constructor(
    // @InjectRepository(OrderEntity)
    // private readonly orderRepository: Repository<OrderEntity>,

    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,

    // private readonly CloudinaryService: CloudinaryService,

    // @InjectRepository(EmployeeEntity)
    // private readonly employeeRepository: Repository<EmployeeEntity>,

    private readonly i18n: CustomI18nService
  ) {}
  async getCommentByOrderId(
    orderId: string
  ): Promise<CommentResponseDto | null> {
    try {
      // Find the comment with relations
      const comment = await this.commentRepository.findOne({
        where: { order: { id: orderId } },
        relations: [
          "order",
          "employee", // Commenting employee
          "order.reviews", // Reviews associated with the order
          "order.reviews.employee", // Employee who made the review
          "order.reviews.artist", // Artist who is being reviewed
        ],
      });

      if (!comment) {
        return null;
      }

      // Map only necessary fields for the commenting employee
      const commentingEmployee = comment.employee
        ? {
            id: comment.employee.id,
            username: comment.employee.username,
            email: comment.employee.email,
            role: comment.employee.role,
            english_Name: comment.employee.english_Name,
            arabic_Name: comment.employee.arabic_Name,
            workingHours: comment.employee.workingHours.toString(), // Convert to string
            phoneNumber: comment.employee.phoneNumber,
            image: comment.employee.image,
            available: comment.employee.available,
            totalReviews: comment.employee.totalReviews,
            status: comment.employee.status,
            oldestAvgRating: comment.employee.oldestAvgRating,
            newestAvgRating: comment.employee.newestAvgRating,
          }
        : null;

      // Map review details, including reviewer and artist information
      const reviewDetails: ReviewResponseDto[] = comment.order.reviews.map(
        (review) => ({
          id: review.id,
          rating: review.rating,
          createdAt: review.createdAt,
          imageOrder: review.imageOrder,
          commentBefore: review.comment_Before,
          commentAfter: review.comment_After,
          reviewer: review.employee
            ? {
                id: review.employee.id,
                username: review.employee.username,
                image: review.employee.image,

                english_Name: review.employee.english_Name,
                role: review.employee.role,
                phoneNumber: review.employee.phoneNumber,
              }
            : null,
          artist: review.artist
            ? {
                id: review.artist.id,
                image: review.artist.image,

                username: review.artist.username,
                english_Name: review.artist.english_Name,
                role: review.artist.role,
                phoneNumber: review.artist.phoneNumber,
              }
            : null,
        })
      );

      // Construct and return the response using the CommentResponseDto structure
      return {
        id: comment.id,
        content: comment.content,
        imageBeforeUrl: comment.imageBeforeUrl,
        imageAfterUrl: comment.imageAfterUrl,
        createdAt: comment.createdAt,
        employee: commentingEmployee,
        reviews: reviewDetails,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        this.i18n.translate("test.COMMENT.RETRIEVE_FAILED"),
        error.stack
      );
    }
  }

  async getComments(dto: GetCommentsDto) {
    const { fromDate, toDate, page, limit } = dto;

    const query = this.commentRepository
      .createQueryBuilder("comment")
      .leftJoinAndSelect("comment.order", "order")
      .leftJoinAndSelect("comment.employee", "employee")
      .orderBy("comment.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    // Apply date filtering if fromDate and toDate are provided
    if (fromDate) {
      query.andWhere("comment.createdAt >= :fromDate", { fromDate });
    }
    if (toDate) {
      query.andWhere("comment.createdAt <= :toDate", { toDate });
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

  async getCustomerComments(
    customerId: string,
    getCommentsDto:GetCommentsbycustomerDto
  ): Promise<PaginatedCommentResponseDto> {
    const { page = 1, limit = 10, fromDate, toDate, sort } = getCommentsDto;

    try {
      const query = this.commentRepository.createQueryBuilder("comment")
        .leftJoinAndSelect("comment.order", "order")
        .leftJoinAndSelect("comment.employee", "employee")
        .leftJoinAndSelect("order.customer", "customer")
        .leftJoinAndSelect("order.reviews", "review")
        .leftJoinAndSelect("review.employee", "reviewEmployee")
        .leftJoinAndSelect("review.artist", "artist")
        .where("customer.id = :customerId", { customerId });

      if (fromDate) {
        const startOfDay = new Date(fromDate);
        startOfDay.setHours(0, 0, 0, 0);
        query.andWhere("comment.createdAt >= :fromDate", { fromDate: startOfDay });
      }

      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.andWhere("comment.createdAt <= :toDate", { toDate: endOfDay });
      }

      query
        .orderBy("comment.createdAt", sort)
        .skip((page - 1) * limit)
        .take(limit);

      const [comments, total] = await query.getManyAndCount();

      const detailedComments = comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        imageBeforeUrl: comment.imageBeforeUrl,
        imageAfterUrl: comment.imageAfterUrl,
        createdAt: comment.createdAt,
        employee: comment.employee ? {
          id: comment.employee.id,
          username: comment.employee.username,
          email: comment.employee.email,
          role: comment.employee.role,
          english_Name: comment.employee.english_Name,
          arabic_Name: comment.employee.arabic_Name,
          workingHours: comment.employee.workingHours?.toString(),
          phoneNumber: comment.employee.phoneNumber,
          image: comment.employee.image,
          available: comment.employee.available,
          totalReviews: comment.employee.totalReviews,
          status: comment.employee.status,
          oldestAvgRating: comment.employee.oldestAvgRating,
          newestAvgRating: comment.employee.newestAvgRating,
        } : null,
        reviews: comment.order?.reviews?.map((review): ReviewResponseDto => ({
          id: review.id,
          rating: review.rating,
          createdAt: review.createdAt,
          imageOrder: review.imageOrder,
          commentBefore: review.comment_Before,
          commentAfter: review.comment_After,
          reviewer: review.employee ? {
            id: review.employee.id,
            username: review.employee.username,
            image: review.employee.image,
            english_Name: review.employee.english_Name,
            role: review.employee.role,
            phoneNumber: review.employee.phoneNumber,
          } : null,
          artist: review.artist ? {
            id: review.artist.id,
            image: review.artist.image,
            username: review.artist.username,
            english_Name: review.artist.english_Name,
            role: review.artist.role,
            phoneNumber: review.artist.phoneNumber,
          } : null,
        })) || [],
      }));

      return {
        items: detailedComments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error in getCustomerComments:', error);
      throw new InternalServerErrorException(
        "Failed to retrieve customer comments",
        error.stack
      );
    }
  }

  async getArtistComments(
    artistId: string,
    getCommentsDto: GetCommentsbycustomerDto
  ): Promise<PaginatedCommentResponseDto> {
    const { page = 1, limit = 10, fromDate, toDate, sort } = getCommentsDto;

    try {
      const query = this.commentRepository.createQueryBuilder("comment")
        .leftJoinAndSelect("comment.order", "order")
        .leftJoinAndSelect("comment.employee", "employee")
        .leftJoinAndSelect("order.reviews", "review")
        .leftJoinAndSelect("review.employee", "reviewEmployee")
        .leftJoinAndSelect("review.artist", "artist")
        // Filter for reviews where the artist ID matches
        .where("artist.id = :artistId", { artistId });

      // Apply date filtering
      if (fromDate) {
        const startOfDay = new Date(fromDate);
        startOfDay.setHours(0, 0, 0, 0);
        query.andWhere("comment.createdAt >= :fromDate", { fromDate: startOfDay });
      }

      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.andWhere("comment.createdAt <= :toDate", { toDate: endOfDay });
      }

      query
        .orderBy("comment.createdAt", sort)
        .skip((page - 1) * limit)
        .take(limit);

      const [comments, total] = await query.getManyAndCount();

      const detailedComments = comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        imageBeforeUrl: comment.imageBeforeUrl,
        imageAfterUrl: comment.imageAfterUrl,
        createdAt: comment.createdAt,
        employee: comment.employee ? {
          id: comment.employee.id,
          username: comment.employee.username,
          email: comment.employee.email,
          role: comment.employee.role,
          english_Name: comment.employee.english_Name,
          arabic_Name: comment.employee.arabic_Name,
          workingHours: comment.employee.workingHours?.toString(),
          phoneNumber: comment.employee.phoneNumber,
          image: comment.employee.image,
          available: comment.employee.available,
          totalReviews: comment.employee.totalReviews,
          status: comment.employee.status,
          oldestAvgRating: comment.employee.oldestAvgRating,
          newestAvgRating: comment.employee.newestAvgRating,
        } : null,
        reviews: comment.order?.reviews?.map((review): ReviewResponseDto => ({
          id: review.id,
          rating: review.rating,
          createdAt: review.createdAt,
          imageOrder: review.imageOrder,
          commentBefore: review.comment_Before,
          commentAfter: review.comment_After,
          reviewer: review.employee ? {
            id: review.employee.id,
            username: review.employee.username,
            image: review.employee.image,
            english_Name: review.employee.english_Name,
            role: review.employee.role,
            phoneNumber: review.employee.phoneNumber,
          } : null,
          artist: review.artist ? {
            id: review.artist.id,
            image: review.artist.image,
            username: review.artist.username,
            english_Name: review.artist.english_Name,
            role: review.artist.role,
            phoneNumber: review.artist.phoneNumber,
          } : null,
        })) || [],
      }));

      return {
        items: detailedComments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error in getArtistComments:', error);
      throw new InternalServerErrorException(
        "Failed to retrieve artist comments",
        error.stack
      );
    }
  }


  
}
