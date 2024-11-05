import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { UpdatePostionDto } from "./dto/update.postion.dto";
import { PositionEntity } from "./entities/postion.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreatePositionDto } from "./dto/create.postion.dto";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { UserEntity } from "../user/entities/user.entity";
import { CustomI18nService } from "../common/custom.18n.service";

@Injectable()
export class PostionService {
  constructor(
    @InjectRepository(PositionEntity)
    private readonly PositionRepository: Repository<PositionEntity>,

    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,

    @InjectRepository(UserEntity)
    private readonly UserRepository: Repository<UserEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly AuditLogRepository: Repository<AuditLogEntity>,
    private readonly i18n: CustomI18nService,
  ) {}

  // Create a new position
  async createPosition(
    createPositionDto: CreatePositionDto,
    userId: string, // Add userId to track who created the position
  ): Promise<PositionEntity> {
    // Create a new position entity
    const position = this.PositionRepository.create(createPositionDto);

    try {
      // Save the position entity to the database
      const savedPosition = await this.PositionRepository.save(position);

      // Log the creation action in the audit log
      await this.saveAuditLogForCreate(savedPosition, userId);

      return savedPosition;
    } catch (error) {
      console.error("Error creating position:", error);
      throw new InternalServerErrorException(
        this.i18n.translate('test.POSITION.CREATE_FAILED')
      );
    }
  }

  // Save the audit log for the create action
  private async saveAuditLogForCreate(
    position: PositionEntity,
    userId: string,
  ) {
    const auditLog = new AuditLogEntity();
    auditLog.tableName = "Position"; // Specify the table name
    auditLog.action = "CREATE"; // Specify the action type
    auditLog.entityId = position.id; // ID of the created position
    auditLog.performedBy = userId; // ID of the user who performed the action

    // Fetch user details for audit log (optional)
    const userDetails = await this.UserRepository.findOne({
      where: { id: userId },
    });
    if (userDetails) {
      auditLog.userDetails = userDetails; // Optional: Add user details for tracking
    }

    // Save the audit log to the audit log repository
    await this.AuditLogRepository.save(auditLog);
  }

  // Get all positions
  async getAllPositions(): Promise<PositionEntity[]> {
    try {
      return await this.PositionRepository.find();
    } catch (error) {
      throw new InternalServerErrorException(
        this.i18n.translate('test.POSITION.RETRIEVE_FAILED')
      );
    }
  }

  // Update a position
  async updatePosition(
    id: string,
    updatePositionDto: UpdatePostionDto,
    userId: string, // Add userId to track who updated the position
  ): Promise<PositionEntity> {
    // Check if the position exists before updating
    const existingPosition = await this.PositionRepository.findOne({
      where: { id },
    });

    if (!existingPosition) {
      throw new NotFoundException(
        this.i18n.translate('test.POSITION.NOT_FOUND')
      );
    }

    try {
      // Update the position
      await this.PositionRepository.update(id, updatePositionDto);

      // Retrieve the updated position
      const updatedPosition = await this.PositionRepository.findOne({
        where: { id },
      });

      // Log the update action in the audit log
      await this.saveAuditLogForUpdate(updatedPosition, userId);

      return updatedPosition;
    } catch (error) {
      throw new InternalServerErrorException(
        this.i18n.translate('test.POSITION.UPDATE_FAILED')
      );
    }
  }

  // Save the audit log for the update action
  private async saveAuditLogForUpdate(
    position: PositionEntity,
    userId: string,
  ) {
    const auditLog = new AuditLogEntity();
    auditLog.tableName = "Position"; // Specify the table name
    auditLog.action = "UPDATE"; // Specify the action type
    auditLog.entityId = position.id; // ID of the updated position
    auditLog.performedBy = userId; // ID of the user who performed the action

    // Fetch user details for audit log (optional)
    const userDetails = await this.UserRepository.findOne({
      where: { id: userId },
    });
    if (userDetails) {
      auditLog.userDetails = userDetails; // Optional: Add user details for tracking
    }

    // Save the audit log to the audit log repository
    await this.AuditLogRepository.save(auditLog);
  }

  // Delete a position
  async removePosition(id: string): Promise<void> {
    const position = await this.PositionRepository.findOne({ where: { id } });

    if (!position) {
      throw new NotFoundException(
        this.i18n.translate('test.POSITION.NOT_FOUND')
      );
    }

    // Update related employees to remove their reference to the position
    await this.employeeRepository.update(
      { position: position },
      { position: null },
    );

    const result = await this.PositionRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(
        this.i18n.translate('test.POSITION.NOT_FOUND')
      );
    }
  }
}
