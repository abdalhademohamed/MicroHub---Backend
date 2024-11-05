import { Injectable, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { CreatePaymentDto } from "./dto/create.payment.dto";
import { UpdatePaymentDto } from "./dto/update.payment.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { PaymentEntity } from "./entities/payment.entity";
import { Repository } from "typeorm";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { CustomI18nService } from "../common/custom.18n.service";

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    private readonly CloudinaryService: CloudinaryService,
    private readonly i18n: CustomI18nService,
  ) {}

  async createPayment(
    createPaymentDto: CreatePaymentDto,
    image: Express.Multer.File,
  ): Promise<PaymentEntity> {
    try {
      const folderName = "Payment";
      const result = await this.CloudinaryService.uploadImage(image, folderName);

      const payment = this.paymentRepository.create({
        methodEnglish: createPaymentDto.methodEnglish,
        methodArabic: createPaymentDto.methodArabic,
        image: result.url,
      });

      return await this.paymentRepository.save(payment);
    } catch (error) {
      if (error.message.includes('upload')) {
        throw new InternalServerErrorException(
          this.i18n.translate('test.PAYMENT.UPLOAD_FAILED')
        );
      }
      throw new InternalServerErrorException(
        this.i18n.translate('test.PAYMENT.CREATE_FAILED')
      );
    }
  }

  async getAllPayments(): Promise<PaymentEntity[]> {
    try {
      return await this.paymentRepository.find();
    } catch (error) {
      throw new InternalServerErrorException(
        this.i18n.translate('test.PAYMENT.RETRIEVE_FAILED')
      );
    }
  }

  async getPaymentById(id: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException(
        this.i18n.translate('test.PAYMENT.NOT_FOUND')
      );
    }
    return payment;
  }

  async updatePayment(
    id: string,
    updatePaymentDto: UpdatePaymentDto,
  ): Promise<PaymentEntity> {
    try {
      await this.paymentRepository.update(id, updatePaymentDto);
      const updatedPayment = await this.paymentRepository.findOne({
        where: { id },
      });
      
      if (!updatedPayment) {
        throw new NotFoundException(
          this.i18n.translate('test.PAYMENT.NOT_FOUND')
        );
      }
      
      return updatedPayment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        this.i18n.translate('test.PAYMENT.UPDATE_FAILED')
      );
    }
  }

  async removePayment(id: string): Promise<void> {
    try {
      const result = await this.paymentRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(
          this.i18n.translate('test.PAYMENT.NOT_FOUND')
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        this.i18n.translate('test.PAYMENT.DELETE_FAILED')
      );
    }
  }
}
