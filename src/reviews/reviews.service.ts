import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CreateReviewDto } from "./dto/create.review.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { ReviewEntity } from "./entities/review.entity";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { OrderEntity } from "../orders/entities/order.entity";
import { LessThan, Repository } from "typeorm";
import { GetReviewsDto } from "./dto/get.reviews.dto";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { UserEntity } from "../user/entities/user.entity";
import { UserService } from "../user/user.service";
import { NotificationService } from "../notification/notification.service";
import { OrderStatus } from "../orders/utils/order.status.enum";

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewRepository: Repository<ReviewEntity>,

    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,

    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(UserEntity)
    private readonly UserRepository: Repository<UserEntity>,

    @InjectRepository(AuditLogEntity)
    private readonly AuditLogRepository: Repository<AuditLogEntity>,
    private eventEmitter: EventEmitter2,
    private readonly notificationService: NotificationService // Inject NotificationService
  ) {}
  @OnEvent("review:changed")
  async onHandleReviewChanged({ ids }: { ids: string[] }) {
    console.log(ids);
    for (let id of ids) {
      const aggregationResult = await this.reviewRepository
        .createQueryBuilder("review")
        .select("review.orderFirstTime", "orderFirstTime") // Group by orderFirstTime (true/false)
        // .addSelect("COUNT(review.id)", "count") // Count reviews for each group
        .addSelect("AVG(review.rating)", "averageRating") // Calculate average rating for each group
        .where("review.artistId = :artistId", { artistId: id }) // Filter by artistId
        .groupBy("review.orderFirstTime") // Group by the orderFirstTime field
        .getRawMany(); // Get raw results
      let oldestRating = 0;
      let newestRating = 0;
      aggregationResult.forEach((result) => {
        if (result.orderFirstTime === false) {
          oldestRating = result.averageRating;
        } else if (result.orderFirstTime === true) {
          newestRating = result.averageRating;
        }
      });
      await this.employeeRepository.update(
        { id },
        {
          oldestAvgRating: oldestRating,
          newestAvgRating: newestRating,
        }
      );
    }
  }
  async createReview(body: CreateReviewDto, userId: string) {
    try {
      const { order } = body;

      // Find the order with relations
      const newestOrder = await this.orderRepository.findOne({
        where: { id: order },
        relations: ["reservation.customer", "artist"],
      });

      // Check if the order exists
      if (!newestOrder) {
        throw new NotFoundException({
          message: `Order not found`,
          error: `Order with ID ${order} not found`,
        });
      }

      // Check if the order is already reviewed
      if (newestOrder.isReviewed) {
        throw new HttpException(
          {
            message: `Order already reviewed`,
            error: `Order with ID ${order} has already been reviewed`,
          },
          400
        );
      }

      // Check if the order is associated with an artist
      if (!newestOrder.artist?.id) {
        throw new HttpException(
          {
            message: `Order not associated with an artist`,
            error: `Order with ID ${order} is not associated with any artist`,
          },
          400
        );
      }

      const employee = await this.employeeRepository.findOneBy({
        id: body.employee,
      });

      if (!employee) {
        throw new NotFoundException({
          message: `Employee not found`,
          error: `Employee with ID ${body.employee} not found`,
        });
      }

      const [orders, count] = await this.orderRepository.findAndCount({
        where: {
          createdAt: LessThan(newestOrder.createdAt),
          reservation: {
            customer: { id: newestOrder.reservation.customer.id },
          },
        },
        order: { createdAt: "DESC" },
        relations: ["reservation.customer", "artist"],
      });

      let reviews = [];
      const ids = [];

      // Create the first review (for the newest order)
      let review = this.reviewRepository.create({
        artist: newestOrder.artist,
        order: newestOrder,
        orderFirstTime: count === 0,
        rating: body.newestRating ?? 0,
        employee,
        comment_After: body.comment_After,
        imageOrder: "after",
      });

      // Save the review and audit log
      await this.saveReviewAndAuditLog(review, userId);
      await this.reviewRepository.save(review);

      // Update the order status and mark it as reviewed
      newestOrder.status = OrderStatus.Reviewed;
      newestOrder.isReviewed = true;
      await this.orderRepository.save(newestOrder);

      reviews.push(review);
      ids.push(newestOrder.artist.id);

      // Emit the event for the first review
      this.eventEmitter.emit("review:changed", { ids });

      // If it's the first order, return the reviews immediately
      if (count === 0) {
        return { items: reviews };
      }

      // Create the second review (for the previous order)
      review = this.reviewRepository.create({
        artist: orders[0].artist,
        order: newestOrder,
        orderFirstTime: false,
        rating: body.oldestRating ?? 0,
        comment_Before: body.comment_Before,
        comment_After: body.comment_After,
        employee,
        imageOrder: "before",
      });

      // Save the second review and audit log
      await this.saveReviewAndAuditLog(review, userId);
      ids.push(orders[0].artist.id);
      reviews.push(review);

      // Send notification to the artist for the second review
      await this.notificationService.createNotification(
        orders[0].artist.id,
        "Order reviewed",
        `Your order with ID ${newestOrder.id} has been reviewed.`
      );

      // Emit the event for the second review
      this.eventEmitter.emit("review:changed", { ids });

      return { items: reviews };
    } catch (error) {
      // Catching unexpected errors and rethrowing them with additional details
      throw new HttpException(
        {
          message: `Failed to create review`,
          error: error.message || error,
        },
        error.status || 500 // Preserve the original error status if it exists
      );
    }
  }

  // Save the second review and audit log
  private async saveReviewAndAuditLog(review: ReviewEntity, userId: string) {
    // Save the review
    await this.reviewRepository.save(review);

    // Create and save the audit log
    const auditLog = new AuditLogEntity();
    auditLog.tableName = "Review";
    auditLog.action = "INSERT";
    auditLog.entityId = review.id;
    auditLog.performedBy = userId;

    // Fetch user details for audit log
    const userDetails = await this.UserRepository.findOne({
      where: { id: userId },
    });
    if (userDetails) {
      auditLog.userDetails = userDetails;
    }

    // Save the audit log
    await this.AuditLogRepository.save(auditLog); // Assuming you have a repository for AuditLogEntity
  }
  async getAllReviews({
    page = 1,
    limit = 10,
    sort = "asc",
  }: GetReviewsDto): Promise<{ reviews: ReviewEntity[]; total: number }> {
    try {
      const query = this.reviewRepository
        .createQueryBuilder("review")
        .leftJoinAndSelect("review.order", "order") // If you need order details
        .leftJoinAndSelect("review.employee", "employee") // If you need employee details
        .leftJoinAndSelect("review.artist", "artist")
        .take(limit)
        .skip((page - 1) * limit)
        .orderBy("review.createdAt", sort.toUpperCase() as "ASC" | "DESC");

      const [reviews, total] = await query.getManyAndCount();

      return { reviews, total };
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to get reviews",
        error.stack
      );
    }
  }
  async getReviewsForArtist(employeeId: string): Promise<ReviewEntity[]> {
    try {
      // Check if the employee exists and is an artist
      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
      });

      if (
        !employee ||
        !employee.employeeType ||
        employee.employeeType.typeEnglish !== "ARTIST"
      ) {
        throw new NotFoundException(
          `Employee with ID ${employeeId} is not an artist or not found`
        );
      }

      // Retrieve reviews for the artist
      const reviews = await this.reviewRepository.find({
        where: { artist: { id: employeeId } }, // Correctly reference employee
        relations: ["order"], // If you need to include order details
      });

      return reviews;
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to get reviews for artist",
        error.stack
      );
    }
  }

  async getReviewsByOrderId(orderId: string): Promise<ReviewEntity[]> {
    // Check if the order exists
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Retrieve reviews associated with the order
    const reviews = await this.reviewRepository.find({
      where: { order: { id: orderId } },
      relations: ["employee"], // Include related entities if needed
    });

    return reviews;
  }

  async isFirstTimeOrder(orderId: string): Promise<boolean> {
    // Find the order by its ID
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["customer"], // Include customer relationship
    });

    if (!order || !order.customer) {
      throw new Error("Order or customer not found");
    }

    // Count all orders by the same customer
    const customerOrdersCount = await this.orderRepository.count({
      where: { customer: order.customer },
    });

    // If this is the only order, it's the first time
    return customerOrdersCount === 1;
  }
}
