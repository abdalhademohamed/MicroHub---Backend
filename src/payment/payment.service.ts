import { Injectable, NotFoundException } from "@nestjs/common";
import { CreatePaymentDto } from "./dto/create.payment.dto";
import { UpdatePaymentDto } from "./dto/update.payment.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { PaymentEntity } from "./entities/payment.entity";
import { Repository } from "typeorm";
import { CloudinaryService } from "../cloudinary/cloudinary.service";

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    private readonly CloudinaryService: CloudinaryService,

  ) {}

  async createPayment(
    createPaymentDto: CreatePaymentDto,
    image: Express.Multer.File
  ): Promise<PaymentEntity> {
  
    // Upload the image to Cloudinary or another cloud service
    const folderName = "Payment";
    const result = await this.CloudinaryService.uploadImage(image, folderName);
  
    // Create the PaymentEntity with the DTO data and the uploaded image URL
    const payment = this.paymentRepository.create({
      methodEnglish: createPaymentDto.methodEnglish,
      methodArabic: createPaymentDto.methodArabic,
      image: result.url, // Use the URL returned from the image upload
    });
  
    // Save the new payment entity to the database
    return await this.paymentRepository.save(payment);
  }
  
  async getAllPayments(): Promise<PaymentEntity[]> {
    return await this.paymentRepository.find();
  }

  async getPaymentById(id: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment method not found');
    }
    return payment;
  }

  async updatePayment(id: string, updatePaymentDto: UpdatePaymentDto): Promise<PaymentEntity> {
    await this.paymentRepository.update(id, updatePaymentDto);
    const updatedPayment = await this.paymentRepository.findOne({ where: { id } });
    if (!updatedPayment) {
      throw new NotFoundException('Payment method not found');
    }
    return updatedPayment;
  }

  async removePayment(id: string): Promise<void> {
    const result = await this.paymentRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Payment method not found');
    }
  }
}
