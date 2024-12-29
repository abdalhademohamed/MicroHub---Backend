import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CreateServiceDto } from "./dto/create.service.dto";
import { UpdateServiceDto } from "./dto/update.service.dto";
import { ServiceEntity } from "./entities/service.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateResultDto } from "../branch/dto/paginate.result.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { UserEntity } from "../user/entities/user.entity";
import { CustomI18nService } from "../common/custom.18n.service";
import { I18nService } from "nestjs-i18n";

@Injectable()
export class ServiceService {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly ServiceRepository: Repository<ServiceEntity>,
    private readonly cloudinaryService: CloudinaryService, // Inject CloudinaryService
    @InjectRepository(UserEntity)
    private readonly UserRepository: Repository<UserEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly AuditLogRepository: Repository<AuditLogEntity>,
    private readonly i18n: CustomI18nService,
  ) {}
  async createService(
    createServiceDto: CreateServiceDto,
    file: Express.Multer.File, // Accept the file as a parameter
    userId: string,            // Pass the userId extracted from the token
  ): Promise<ServiceEntity> {
    // Check if a service with the same name exists
    const existingService = await this.ServiceRepository.findOne({
      where: [
        { arabic_Name: createServiceDto.arabic_Name },
        { english_Name: createServiceDto.english_Name },
      ],
    });
  
    if (existingService) {
      throw new ConflictException(
        this.i18n.translate('test.SERVICE.NAME_EXISTS')
      );
    }
  
    try {
      // Upload the photo to Cloudinary
      const folderName = "services";
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        folderName,
      );
  
      // Create and save the new service
      const service = this.ServiceRepository.create({
        ...createServiceDto,
        imageUrl: uploadResult.url, // Save the image URL in the database
      });
  
      const savedService = await this.ServiceRepository.save(service);
  
      // Save the audit log
      // await this.saveAuditLog(savedService.id, userId);
  
      return savedService; // Returns status code 201 Created
    } catch (error) {
      console.log(error);
      // Handle unexpected errors
      throw new InternalServerErrorException(
        this.i18n.translate('test.SERVICE.CREATE_FAILED')
      );
    }
  }
  
  // Save the audit log
  private async saveAuditLog(serviceId: string, userId: string) {
    // Create and save the audit log
    const auditLog = new AuditLogEntity();
    auditLog.tableName = 'Service';
    auditLog.action = 'INSERT';
    auditLog.entityId = serviceId;
    auditLog.performedBy = userId;
  
    // Fetch user details for the audit log
    const userDetails = await this.UserRepository.findOne({ where: { id: userId } });
    if (userDetails) {
      auditLog.userDetails = userDetails;
    }
  
    // Save the audit log
    await this.AuditLogRepository.save(auditLog);
  }
  
  async getAllServices(
    page: number = 1,
    limit: number = 10,
    sortBy: string = "english_Name", // Default sorting by 'englishName'
    order: "ASC" | "DESC" = "ASC", // Default order 'ASC'
  ): Promise<PaginateResultDto<ServiceEntity>> {
    try {
      // Ensure pagination parameters are valid
      const pageNumber = Math.max(1, page);
      const pageSize = Math.max(1, limit);
      const offset = (pageNumber - 1) * pageSize;

      // Fetch total count of services
      const [items, total] = await this.ServiceRepository.findAndCount({
        skip: offset,
        take: pageSize,
        order: { [sortBy]: order },
      });

      // Calculate total pages
      const totalPages = Math.ceil(total / pageSize);

      // Return paginated and sorted result
      return {
        items,
        total,
        currentPage: pageNumber,
        totalPages,
      };
    } catch (error) {
      // Handle unexpected errors
      // 500 Internal Server Error
      throw new InternalServerErrorException(
        this.i18n.translate('test.SERVICE.FETCH_FAILED')
      );
    }
  }

  async updateService(
    id: string,
    updateServiceDto: CreateServiceDto,
    userId: string,  // Pass the userId for audit logging
    image?: Express.Multer.File,
  ): Promise<ServiceEntity> {
    // Find the existing service or throw a not found exception
    const service = await this.ServiceRepository.findOne({ where: { id } });
  
    if (!service) {
      throw new NotFoundException(
        this.i18n.translate('test.SERVICE.NOT_FOUND', { args: { id } })
      );
    }
  
    // Store original values before updating for auditing
    const originalService = { ...service };
  
    // Update properties only if they are provided in the DTO
    service.arabic_Name = updateServiceDto.arabic_Name ?? service.arabic_Name;
    service.english_Name = updateServiceDto.english_Name ?? service.english_Name;
    service.price = updateServiceDto.price ?? service.price;
    service.duration_Mins = updateServiceDto.duration_Mins ?? service.duration_Mins;
    service.rootosh_Number = updateServiceDto.rootosh_Number ?? service.rootosh_Number;
    service.months_To_Expire = updateServiceDto.months_To_Expire ?? service.months_To_Expire;
  
    // Handle image upload if a file is provided
    if (image) {
      try {
        const uploadedImage = await this.cloudinaryService.uploadImage(
          image,
          "services",
        );
        service.imageUrl = uploadedImage.url;
      } catch (error) {
        throw new InternalServerErrorException(
          this.i18n.translate('test.SERVICE.IMAGE_UPLOAD_FAILED')
        );
      }
    }
  
    // Save the updated service entity to the database
    try {
      const updatedService = await this.ServiceRepository.save(service);
  
      // Log the update action in the audit log
      await this.UpdateAuditLog(updatedService, originalService, userId);
  
      return updatedService;
    } catch (error) {
      console.error("Error updating service:", error);
      throw new InternalServerErrorException(
        this.i18n.translate('test.SERVICE.UPDATE_FAILED')
      );
    }
  }
  
  // Save the audit log
  private async UpdateAuditLog(
    updatedService: ServiceEntity,
    originalService: Partial<ServiceEntity>,
    userId: string,
  ) {
    // Create audit log for each updated field
    const changes = [];
    if (originalService.arabic_Name !== updatedService.arabic_Name) {
      changes.push(`arabic_Name: ${originalService.arabic_Name} -> ${updatedService.arabic_Name}`);
    }
    if (originalService.english_Name !== updatedService.english_Name) {
      changes.push(`english_Name: ${originalService.english_Name} -> ${updatedService.english_Name}`);
    }
    if (originalService.price !== updatedService.price) {
      changes.push(`price: ${originalService.price} -> ${updatedService.price}`);
    }
    if (originalService.duration_Mins !== updatedService.duration_Mins) {
      changes.push(`duration_Mins: ${originalService.duration_Mins} -> ${updatedService.duration_Mins}`);
    }
    if (originalService.rootosh_Number !== updatedService.rootosh_Number) {
      changes.push(`rootosh_Number: ${originalService.rootosh_Number} -> ${updatedService.rootosh_Number}`);
    }
    if (originalService.months_To_Expire !== updatedService.months_To_Expire) {
      changes.push(`months_To_Expire: ${originalService.months_To_Expire} -> ${updatedService.months_To_Expire}`);
    }
    if (originalService.imageUrl !== updatedService.imageUrl) {
      changes.push(`imageUrl: ${originalService.imageUrl} -> ${updatedService.imageUrl}`);
    }
  
    // Create and save the audit log
    const auditLog = new AuditLogEntity();
    auditLog.tableName = 'Service';
    auditLog.action = 'UPDATE';
    auditLog.entityId = updatedService.id;
    auditLog.performedBy = userId;
  
    // Fetch user details for the audit log
    const userDetails = await this.UserRepository.findOne({ where: { id: userId } });
    if (userDetails) {
      auditLog.userDetails = userDetails;
    }
  
    // Save the audit log
    await this.AuditLogRepository.save(auditLog);
  }
  

  async deleteService(id: string): Promise<void> {
    try {
      // Attempt to delete the service with the given ID
      const result = await this.ServiceRepository.delete(id);

      // If no rows are affected, it means the service with the given ID does not exist
      if (result.affected === 0) {
        // Status Code: 404 Not Found
        throw new NotFoundException(
          this.i18n.translate('test.SERVICE.NOT_FOUND', { args: { id } })
        );
      }

      // Status Code: 204 No Content
      // No explicit return is needed; a successful deletion typically results in a 204 response.
    } catch (error) {
      // Handle unexpected errors and throw an InternalServerErrorException
      // Status Code: 500 Internal Server Error
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        this.i18n.translate('test.SERVICE.DELETE_FAILED')
      );
    }
  }





  async countServices(): Promise<number> {
    return await this.ServiceRepository.count();
  }
} 
