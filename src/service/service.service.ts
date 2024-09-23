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

@Injectable()
export class ServiceService {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly ServiceRepository: Repository<ServiceEntity>,
    private readonly cloudinaryService: CloudinaryService, // Inject CloudinaryService
  ) {}
  async createService(
    createServiceDto: CreateServiceDto,
    file: Express.Multer.File, // Accept the file as a parameter
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
        "A service with the given name already exists.",
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
        imageUrl: uploadResult.secure_url, // Save the image URL in the database
      });

      return await this.ServiceRepository.save(service); // Returns status code 201 Created
    } catch (error) {
      // Handle unexpected errors
      throw new InternalServerErrorException(
        "An unexpected error occurred while creating the service.",
      );
    }
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
        "An unexpected error occurred while retrieving services.",
      );
    }
  }

  async updateService(
    id: string,
    updateServiceDto: CreateServiceDto,
    image?: Express.Multer.File,
  ): Promise<ServiceEntity> {
    // Find the existing service or throw a not found exception
    const service = await this.ServiceRepository.findOne({ where: { id } });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found.`);
    }

    // Update properties only if they are provided in the DTO
    service.arabic_Name = updateServiceDto.arabic_Name ?? service.arabic_Name;
    service.english_Name =
      updateServiceDto.english_Name ?? service.english_Name;
    service.price = updateServiceDto.price ?? service.price;
    service.duration_Mins =
      updateServiceDto.duration_Mins ?? service.duration_Mins;
    service.rootosh_Number =
      updateServiceDto.rootosh_Number ?? service.rootosh_Number;
    service.months_To_Expire =
      updateServiceDto.months_To_Expire ?? service.months_To_Expire;

    // Handle image upload if a file is provided
    if (image) {
      try {
        const uploadedImage = await this.cloudinaryService.uploadImage(
          image,
          "services",
        );
        service.imageUrl = uploadedImage.url;
      } catch (error) {
        throw new InternalServerErrorException("Failed to upload image");
      }
    }

    // Save the updated service entity to the database
    try {
      return await this.ServiceRepository.save(service);
    } catch (error) {
      console.error("Error updating service:", error);
      throw new InternalServerErrorException(
        "An unexpected error occurred while updating the service.",
      );
    }
  }

  async deleteService(id: string): Promise<void> {
    try {
      // Attempt to delete the service with the given ID
      const result = await this.ServiceRepository.delete(id);

      // If no rows are affected, it means the service with the given ID does not exist
      if (result.affected === 0) {
        // Status Code: 404 Not Found
        throw new NotFoundException(`Service with ID ${id} not found.`);
      }

      // Status Code: 204 No Content
      // No explicit return is needed; a successful deletion typically results in a 204 response.
    } catch (error) {
      // Handle unexpected errors and throw an InternalServerErrorException
      // Status Code: 500 Internal Server Error
      throw new InternalServerErrorException(
        "An unexpected error occurred while deleting the service.",
      );
    }
  }
}
