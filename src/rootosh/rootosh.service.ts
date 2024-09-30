import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CreateRootoshDto } from "./dto/create-rootosh.dto";
import { UpdateRootoshDto } from "./dto/update-rootosh.dto";
import { RootoshEntity } from "./entities/rootosh.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { ServiceEntity } from "../service/entities/service.entity";
import { Repository } from "typeorm";
import { UserEntity } from "../user/entities/user.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";

@Injectable()
export class RootoshService {
  constructor(
    @InjectRepository(RootoshEntity)
    private readonly rootoshRepository: Repository<RootoshEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,

    @InjectRepository(UserEntity)
    private readonly UserRepository: Repository<UserEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly AuditLogRepository: Repository<AuditLogEntity>,
  ) {}

  async createRootosh(
    createRootoshDto: CreateRootoshDto,
    userId: string,  // Accept userId as a parameter for audit logging
  ): Promise<RootoshEntity> {
    const { serviceId, ...rootoshData } = createRootoshDto;
  
    // Find the service by its ID
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
    });
  
    // If the service is not found, throw a 404 exception
    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found.`);
    }
  
    // Create the rootosh entity
    const rootosh = this.rootoshRepository.create({ ...rootoshData, service });
  
    try {
      // Save the rootosh entity to the database
      const savedRootosh = await this.rootoshRepository.save(rootosh);
  
      // Save the audit log for the creation action
      await this.saveAuditLogForCreate(savedRootosh, userId);
  
      return savedRootosh;
    } catch (error) {
      // Handle unexpected errors
      throw new InternalServerErrorException("Failed to create rootosh.");
    }
  }
  
  // Save the audit log for the create action
  private async saveAuditLogForCreate(rootosh: RootoshEntity, userId: string) {
    const auditLog = new AuditLogEntity();
    auditLog.tableName = 'Rootosh';  // Specify the table name
    auditLog.action = 'INSERT';  // Specify the action type
    auditLog.entityId = rootosh.id;  // ID of the created entity
    auditLog.performedBy = userId;  // ID of the user who performed the action
  
    // Fetch user details for audit log
    const userDetails = await this.UserRepository.findOne({ where: { id: userId } });
    if (userDetails) {
      auditLog.userDetails = userDetails;  // Optional: Add user details for further tracking
    }
  
    // Save the audit log to the audit log repository
    await this.AuditLogRepository.save(auditLog);
  }
  async findAllRootosh(
    page: number,
    limit: number,
  ): Promise<{
    data: RootoshEntity[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const [data, total] = await this.rootoshRepository.findAndCount({
      relations: ["service"],
      skip: (page - 1) * limit,
      take: limit,
    });

    const lastPage = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      lastPage,
    };
  }
  async findOneRootosh(id: string): Promise<RootoshEntity> {
    const rootosh = await this.rootoshRepository.findOne({
      where: { id },
      relations: ["service"],
    });
    if (!rootosh) {
      throw new NotFoundException(`Rootosh with ID ${id} not found.`);
    }
    return rootosh;
  }

  async findOneRootoshByServiceId(serviceId: string): Promise<RootoshEntity> {
    const rootosh = await this.rootoshRepository.findOne({
      where: {
        service: { id: serviceId },
      },
      relations: ["service"], // Ensure that the related 'service' is included
    });

    if (!rootosh) {
      throw new NotFoundException(
        `Rootosh associated with service ID ${serviceId} not found.`,
      );
    }

    return rootosh;
  }
  async updateRootosh(
    id: string,
    updateRootoshDto: UpdateRootoshDto,
    userId: string, // Accept userId for audit logging
  ): Promise<RootoshEntity> {
    // Preload the rootosh entity with the updated data
    const rootosh = await this.rootoshRepository.preload({
      id,
      ...updateRootoshDto,
    });
  
    // Throw an exception if the rootosh does not exist
    if (!rootosh) {
      throw new NotFoundException(`Rootosh with ID ${id} not found.`);
    }
  
    // Check if serviceId is provided and update the service relation if needed
    if (updateRootoshDto.serviceId) {
      const service = await this.serviceRepository.findOne({
        where: { id: updateRootoshDto.serviceId },
      });
      if (!service) {
        throw new NotFoundException(
          `Service with ID ${updateRootoshDto.serviceId} not found.`,
        );
      }
      rootosh.service = service;
    }
  
    try {
      // Save the updated rootosh entity to the database
      const updatedRootosh = await this.rootoshRepository.save(rootosh);
  
      // Log the update action to the audit log
      await this.saveAuditLogForUpdate(updatedRootosh, userId);
  
      return updatedRootosh;
    } catch (error) {
      // Handle unexpected errors
      throw new InternalServerErrorException("Failed to update rootosh.");
    }
  }
  
  // Save the audit log for the update action
  private async saveAuditLogForUpdate(rootosh: RootoshEntity, userId: string) {
    const auditLog = new AuditLogEntity();
    auditLog.tableName = 'Rootosh';  // Specify the table name
    auditLog.action = 'UPDATE';  // Specify the action type
    auditLog.entityId = rootosh.id;  // ID of the updated entity
    auditLog.performedBy = userId;  // ID of the user who performed the action
  
    // Fetch user details for audit log
    const userDetails = await this.UserRepository.findOne({ where: { id: userId } });
    if (userDetails) {
      auditLog.userDetails = userDetails;  // Optional: Add user details for further tracking
    }
  
    // Save the audit log to the audit log repository
    await this.AuditLogRepository.save(auditLog);
  }
  async removeRootosh(id: string): Promise<void> {
    const result = await this.rootoshRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Rootosh with ID ${id} not found.`);
    }
  }
}
