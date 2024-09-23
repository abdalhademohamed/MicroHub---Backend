import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
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
    private readonly employeeRepository: Repository<EmployeeEntity>,
  ) {}

  async addComment(
    orderId: string,
    content: string,
    imageBefore: Express.Multer.File,
    imageAfter: Express.Multer.File,
    userId: string,
  ): Promise<any> {
    // Find the order
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (!imageBefore || !imageAfter) {
      throw new BadRequestException("Photo is required");
    }
    // Find the employee
    const employee = await this.employeeRepository.findOne({
      where: { id: userId },
    });
    // Check if the employee is the owner of the order
    if (order.artist.id !== userId) {
      throw new BadRequestException(
        "You are not authorized to comment on this order",
      );
    }

    // Upload image
    const folderName = "reservation"; // or any other dynamic name based on context
    const resultimagebefore = await this.CloudinaryService.uploadImage(
      imageBefore,
      folderName,
    );
    const resultimageafter = await this.CloudinaryService.uploadImage(
      imageAfter,
      folderName,
    );

    // Create and save the comment
    const comment = this.commentRepository.create({
      content,
      imageBeforeUrl: resultimagebefore.url,
      imageAfterUrl: resultimageafter.url,
      order,
      employee, // Optionally link the comment to the artist
    });

    try {
      return await this.commentRepository.save(comment);
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to add comment",
        error.stack,
      );
    }
  }
}
