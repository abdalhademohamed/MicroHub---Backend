import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceEntity } from './entities/service.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateResultDto } from '../branch/dto/paginate.result.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

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
        'A service with the given name already exists.',
      );
    }

    try {
      // Upload the photo to Cloudinary
      const folderName = 'services';
      const uploadResult = await this.cloudinaryService.uploadImage(file, folderName);

      // Create and save the new service
      const service = this.ServiceRepository.create({
        ...createServiceDto,
        imageUrl: uploadResult.secure_url, // Save the image URL in the database
      });

      return await this.ServiceRepository.save(service); // Returns status code 201 Created
    } catch (error) {
      // Handle unexpected errors
      throw new InternalServerErrorException(
        'An unexpected error occurred while creating the service.',
      );
    }
  }
  async getAllServices(
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'english_Name',  // Default sorting by 'englishName'
    order: 'ASC' | 'DESC' = 'ASC'  // Default order 'ASC'
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
        'An unexpected error occurred while retrieving services.',
      );
    }
  }

 
  async updateService(id: string, updateServiceDto: CreateServiceDto): Promise<ServiceEntity> {
    
    

    try {
      // Attempt to preload the existing service with the given ID and updated DTO data
      const service = await this.ServiceRepository.preload({
        id,
        ...updateServiceDto,
      });
      // If no service is found for the given ID, throw a NotFoundException
      if (!service) {
        // Status Code: 404 Not Found
        throw new NotFoundException(`Service with ID ${id} not found.`);
      }

      // Save the updated service entity to the database
      // Status Code: 200 OK
      return await this.ServiceRepository.save(service);
    } catch (error) {
      // Handle unexpected errors and throw an InternalServerErrorException
      // Status Code: 500 Internal Server Error
      throw new InternalServerErrorException('An unexpected error occurred while updating the service.');
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
      throw new InternalServerErrorException('An unexpected error occurred while deleting the service.');
    }
  }
}

