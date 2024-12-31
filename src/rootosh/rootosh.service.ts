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
import { CustomI18nService } from "../common/custom.18n.service";
import { I18nService } from "nestjs-i18n";

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
    private readonly i18n: CustomI18nService,
  ) {}

  async createRootosh(
    createRootoshDto: CreateRootoshDto,
    userId: string, // Accept userId for audit logging
  ): Promise<RootoshEntity> {
    const { serviceId, ...rootoshData } = createRootoshDto;

    // Find the related service
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException(
        this.i18n.translate("test.ROOTOSH.SERVICE_NOT_FOUND", {
          args: { serviceId },
        }),
      );
    }

    // Create the rootosh entity
    const rootosh = this.rootoshRepository.create({ ...rootoshData, service });

    try {
      // Save the rootosh to the database
      const savedRootosh = await this.rootoshRepository.save(rootosh);

      // Save audit log
      await this.saveAuditLogForCreate(savedRootosh, userId);

      return savedRootosh;
    } catch (error) {
      // Handle unexpected errors
      throw new InternalServerErrorException(
        this.i18n.translate("test.ROOTOSH.CREATE_FAILED"),
      );
    }
  }

  // Save the audit log for the create action
  private async saveAuditLogForCreate(rootosh: RootoshEntity, userId: string) {
    const auditLog = new AuditLogEntity();
    auditLog.tableName = "Rootosh"; // Specify the table name
    auditLog.action = "INSERT"; // Specify the action type
    auditLog.entityId = rootosh.id; // ID of the created entity
    auditLog.performedBy = userId; // ID of the user who performed the action

    // Fetch user details for audit log
    const userDetails = await this.UserRepository.findOne({
      where: { id: userId },
    });
    if (userDetails) {
      auditLog.userDetails = userDetails; // Optional: Add user details for further tracking
    }

    // Save the audit log to the audit log repository
    await this.AuditLogRepository.save(auditLog);
  }
  async findAllRootosh(
    page: number,
    limit: number,
  ): Promise<{
    items: RootoshEntity[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const [items, total] = await this.rootoshRepository.findAndCount({
      relations: ["service"],
      skip: (page - 1) * limit,
      take: limit,
    });

    const lastPage = Math.ceil(total / limit);

    return {
      items,
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
      throw new NotFoundException(
        this.i18n.translate("test.ROOTOSH.NOT_FOUND", { args: { id } }),
      );
    }
    return rootosh;
  }

  // Function to get Rootoshes by serviceId
  async getRootoshesByServiceId(serviceId: string): Promise<RootoshEntity[]> {
    // Check if the service exists first
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException(
        this.i18n.translate("test.ROOTOSH.SERVICE_NOT_FOUND", {
          args: { serviceId },
        }),
      );
    }

    // Find and return all rootoshes associated with the given service
    return this.rootoshRepository.find({
      where: { service: { id: serviceId } },
    });
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
      throw new NotFoundException(
        this.i18n.translate("test.ROOTOSH.NOT_FOUND", { args: { id } }),
      );
    }

    // Check if serviceId is provided and update the service relation if needed
    if (updateRootoshDto.serviceId) {
      const service = await this.serviceRepository.findOne({
        where: { id: updateRootoshDto.serviceId },
      });
      if (!service) {
        throw new NotFoundException(
          this.i18n.translate("test.ROOTOSH.SERVICE_NOT_FOUND", {
            args: { serviceId: updateRootoshDto.serviceId },
          }),
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
      throw new InternalServerErrorException(
        this.i18n.translate("test.ROOTOSH.UPDATE_FAILED"),
      );
    }
  }

  // Save the audit log for the update action
  private async saveAuditLogForUpdate(rootosh: RootoshEntity, userId: string) {
    const auditLog = new AuditLogEntity();
    auditLog.tableName = "Rootosh"; // Specify the table name
    auditLog.action = "UPDATE"; // Specify the action type
    auditLog.entityId = rootosh.id; // ID of the updated entity
    auditLog.performedBy = userId; // ID of the user who performed the action

    // Fetch user details for audit log
    const userDetails = await this.UserRepository.findOne({
      where: { id: userId },
    });
    if (userDetails) {
      auditLog.userDetails = userDetails; // Optional: Add user details for further tracking
    }

    // Save the audit log to the audit log repository
    await this.AuditLogRepository.save(auditLog);
  }
  async removeRootosh(id: string): Promise<void> {
    const result = await this.rootoshRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        this.i18n.translate("test.ROOTOSH.NOT_FOUND", { args: { id } }),
      );
    }
  }
}
