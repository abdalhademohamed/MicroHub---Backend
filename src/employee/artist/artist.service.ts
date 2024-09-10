import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmployeeEntity } from "../entities/employee.entity";
import { ReservationEntity } from "../../reservation/entities/reservation.entity";
import { OrderEntity } from "../../orders/entities/order.entity";
import { CommentEntity } from "../../comment/entities/comment.entity";
import { CloudinaryService } from "../../cloudinary/cloudinary.service";

@Injectable()
export class ArtistService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,

    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,

    private readonly CloudinaryService: CloudinaryService,

    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>
  ) {}

  async addComment(
    orderId: string,
    content: string,
    image: Express.Multer.File,
    userId: string
  ): Promise<any> {
    // Find the order
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (!image) {
      throw new BadRequestException("Photo is required");
    }
    // Find the employee
    const employee = await this.employeeRepository.findOne({
      where: { id: userId },
    });
    // Check if the employee is the owner of the order
    if (order.artist.id !== userId) {
      throw new BadRequestException(
        "You are not authorized to comment on this order"
      );
    }

    // Upload image
    const folderName = "reservation"; // or any other dynamic name based on context
    const result = await this.CloudinaryService.uploadImage(image, folderName);

    // Create and save the comment
    const comment = this.commentRepository.create({
      content,
      imageUrl: result.url,
      order,
      employee, // Optionally link the comment to the artist
    });

    try {
      return await this.commentRepository.save(comment);
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to add comment",
        error.stack
      );
    }
  }



  // async getTotalReviews(employeeId: string): Promise<number> {
  //   try {
  //     // Check if the employee exists
  //     const employee = await this.employeeRepository.findOne({
  //       where: { id: employeeId },
  //     });

  //     if (!employee) {
  //       throw new NotFoundException(`Employee with ID ${employeeId} not found`);
  //     }

  //     // Count the number of comments associated with the employee
  //     const totalReviews = await this.commentRepository.count({
  //       where: { employee: { id: employeeId } },
  //     });

  //     return totalReviews;

  //   } catch (error) {
  //     throw new InternalServerErrorException(
  //       'Failed to get total reviews',
  //       error.stack
  //     );
  //   }
  // }



  
}