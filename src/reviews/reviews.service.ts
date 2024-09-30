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
        .where("review.artistId = :artistId", { artistId :id }) // Filter by artistId
        .groupBy("review.orderFirstTime") // Group by the orderFirstTime field
        .getRawMany(); // Get raw results
        // console.log(aggregationResult);
      await this.employeeRepository.update(
        { id },
        {
          oldestAvgRating: aggregationResult[1]?.averageRating,
          newestAvgRating: aggregationResult[0]?.averageRating,
        },
      );
    }
  }
  async createReview(body: CreateReviewDto,userId:string) {
    const { order } = body;

    const newestOrder = await this.orderRepository.findOne({
      where: { id: order },
      relations: ["reservation.customer", "artist"],
    });

    if (!newestOrder) {
      throw new NotFoundException(`Order with ID ${order} not found`);
    }
    if(!newestOrder.artist?.id){
      throw new HttpException(`Order with ID not associated with artist `, 400)
    }
    // console.log(newestOrder.artist?.id)

    const employee = await this.employeeRepository.findOneBy({
      id: body.employee,
    });
    // console.log(employee);
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
    let review = this.reviewRepository.create({
      artist: newestOrder.artist,
      order: newestOrder,
      orderFirstTime: count == 0 ? true : false,
      rating: body.newestRating ?? 0,
      employee,
      imageOrder: 'after'
    });
    // Save the review and audit log
  await this.saveReviewAndAuditLog(review, userId);
    // console.log(review);
    await this.reviewRepository.save(review);
    reviews.push(review);
    //  await this.saveReviewAndAuditLog(secondReview, userId);

    ids.push(newestOrder.artist.id);
    console.log(ids)
    if (count == 0) {
      this.eventEmitter.emit("review:changed", { ids });
      return { items: reviews };
    }
    review = this.reviewRepository.create({
      artist: orders[0].artist,
      order: newestOrder,
      orderFirstTime: false,
      rating: body.oldestRating ?? 0,
      employee,
      imageOrder: 'before'
    });
     // Save the second review and audit log
  await this.saveReviewAndAuditLog(review, userId);
    ids.push(orders[0].artist.id);
    reviews.push(review);
    this.eventEmitter.emit("review:changed", { ids });
    reviews.push(review);
    return { items: reviews };
  }

 
 // Save the second review and audit log
  private async saveReviewAndAuditLog(review: ReviewEntity, userId: string) {
    // Save the review
    await this.reviewRepository.save(review);

    // Create and save the audit log
    const auditLog = new AuditLogEntity();
    auditLog.tableName = 'Review';
    auditLog.action = 'INSERT';
    auditLog.entityId = review.id;
    auditLog.performedBy = userId;

    // Fetch user details for audit log
    const userDetails = await this.UserRepository.findOne({ where: { id: userId } });
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
        error.stack,
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
          `Employee with ID ${employeeId} is not an artist or not found`,
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
        error.stack,
      );
    }
  }

   async getReviewsByOrderId(orderId: string): Promise<ReviewEntity[]> {
    // Check if the order exists
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Retrieve reviews associated with the order
    const reviews = await this.reviewRepository.find({
      where: { order: { id: orderId } },
      relations: ['employee'], // Include related entities if needed
    });

    return reviews;
  }
}