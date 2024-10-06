import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CreateOfferDto } from "./dto/create.offer.dto";
import { UpdateOfferDto } from "./dto/update.offer.dto";
import { InjectEntityManager, InjectRepository } from "@nestjs/typeorm";
import { OfferEntity } from "./entities/offer.entity";
import { ServiceEntity } from "../service/entities/service.entity";
import { BranchEntity } from "../branch/entities/branch.entity";
import { EntityManager, In, MoreThan, Repository } from "typeorm";
import { UpdateIsActiveDto } from "./dto/update.active.dto";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { UserEntity } from "../user/entities/user.entity";

@Injectable()
export class OfferService {
  constructor(
    @InjectRepository(OfferEntity)
    private OfferRepository: Repository<OfferEntity>,

    @InjectRepository(ServiceEntity)
    private ServiceRepository: Repository<ServiceEntity>,

    @InjectRepository(BranchEntity)
    private BranchRepository: Repository<BranchEntity>,

    @InjectRepository(UserEntity)
    private UserRepository: Repository<UserEntity>,

    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}
  async create(
    createOfferDto: CreateOfferDto,
    userId: string,
  ): Promise<OfferEntity> {
    const { serviceIds, branchIds, ...offerData } = createOfferDto;

    // Fetch related entities based on IDs
    const services = await this.ServiceRepository.find({
      where: { id: In(serviceIds) },
    });
    const branches = await this.BranchRepository.find({
      where: { id: In(branchIds) },
    });

    // Handle cases where no branches were found
    if (!branches || branches.length === 0) {
      throw new NotFoundException(`Branch with ID(s) "${branchIds}" not found`);
    }

    // Validate date range
    if (new Date(offerData.startDateTime) >= new Date(offerData.endDateTime)) {
      throw new BadRequestException("End date must be after the start date");
    }

    // Determine if the offer should be active based on the start date
    const today = new Date();
    const startDateTime = new Date(offerData.startDateTime);
    const isActive = today.toDateString() === startDateTime.toDateString();

    // Create and save the offer
    const offer = this.OfferRepository.create({
      ...offerData,
      services,
      branches,
      isActive, // Set the isActive attribute
    });

    let savedOffer: OfferEntity;

    await this.entityManager.transaction(async (transactionalEntityManager) => {
      try {
        // Save the offer
        savedOffer = await transactionalEntityManager.save(OfferEntity, offer);

        // Create an audit log entry for the creation
        const auditLog = new AuditLogEntity();
        auditLog.tableName = "offer"; // Log the offer table
        auditLog.action = "INSERT";
        auditLog.entityId = savedOffer.id; // ID of the created entity
        auditLog.performedBy = userId; // User who created the offer

        // Fetch user details if needed
        if (userId) {
          const user = await this.UserRepository.findOne({
            where: { id: userId },
          });
          if (user) {
            auditLog.userDetails = {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
            };
          }
        }

        await transactionalEntityManager.save(AuditLogEntity, auditLog);
      } catch (error) {
        console.error("Error creating offer and audit log:", error);
        throw new InternalServerErrorException("Failed to create offer");
      }
    });

    return savedOffer;
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ items: OfferEntity[]; total: number }> {
    try {
      // Validate pagination parameters
      if (page < 1 || limit < 1) {
        throw new BadRequestException(
          "Pagination parameters must be positive integers",
        );
      }

      // Retrieve paginated results
      const [results, total] = await this.OfferRepository.findAndCount({
        relations: ["services", "branches"],
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        items: results,
        total,
      };
    } catch (error) {
      // Handle any errors and throw appropriate exceptions
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new InternalServerErrorException(
          "An error occurred while retrieving offers",
        );
      }
    }
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async findActiveOffers(): Promise<OfferEntity[]> {
    const now = new Date();
    return await this.OfferRepository.find({
      where: {
        endDateTime: MoreThan(now),
        isActive: true, // Ensure the offer is active
      },
      relations: ["services", "branches"],
    });
  }
  
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async findOne(id: string): Promise<OfferEntity> {
    const offer = await this.OfferRepository.findOne({
      where: { id },
      relations: ["services", "branches"],
    });

    if (!offer) {
      throw new NotFoundException(`Offer with ID "${id}" not found`);
    }

    return offer;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async update(
    offerId: string,
    updateOfferDto: UpdateOfferDto,
    userId: string,
  ): Promise<OfferEntity> {
    const offer = await this.OfferRepository.findOne({
      where: { id: offerId },
    }); // Ensure this method is used correctly

    if (!offer) {
      throw new NotFoundException(`Offer with ID "${offerId}" not found`);
    }

    const { serviceIds, branchIds, ...offerData } = updateOfferDto;

    // Fetch new services and branches if provided, otherwise keep existing ones
    const services = serviceIds
      ? await this.ServiceRepository.findByIds(serviceIds)
      : offer.services;
    const branches = branchIds
      ? await this.BranchRepository.findByIds(branchIds)
      : offer.branches;

    // Update offer entity with new data
    Object.assign(offer, offerData, { services, branches, updatedBy: userId });

    let updatedOffer: OfferEntity;

    await this.entityManager.transaction(async (transactionalEntityManager) => {
      try {
        // Save the updated offer
        updatedOffer = await transactionalEntityManager.save(
          OfferEntity,
          offer,
        );

        // Create an audit log entry for the update
        const auditLog = new AuditLogEntity();
        auditLog.tableName = "offer";
        auditLog.action = "UPDATE";
        auditLog.entityId = updatedOffer.id;
        auditLog.performedBy = userId;

        // Collect changes details
        const oldOffer = await transactionalEntityManager.findOne(OfferEntity, {
          where: { id: updatedOffer.id },
        });
        const changedColumns = Object.keys(offerData);
        const changesDetails = {};

        changedColumns.forEach((column) => {
          changesDetails[column] = {
            oldValue: oldOffer[column],
            newValue: updatedOffer[column],
          };
        });

        auditLog.changedColumns = changedColumns;
        auditLog.changesDetails = changesDetails;

        if (userId) {
          const user = await this.UserRepository.findOne({
            where: { id: userId },
          });
          if (user) {
            auditLog.userDetails = {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
            };
          }
        }

        await transactionalEntityManager.save(AuditLogEntity, auditLog);
      } catch (error) {
        console.error("Error updating offer and audit log:", error);
        throw new InternalServerErrorException("Failed to update offer");
      }
    });

    return updatedOffer;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async updateIsActive(
    id: string,
    UpdateIsActiveDto: UpdateIsActiveDto,
  ): Promise<OfferEntity> {
    // Fetch the offer by ID
    const offer = await this.OfferRepository.findOneBy({ id });

    // Handle cases where the offer is not found
    if (!offer) {
      throw new NotFoundException(`Offer with ID "${id}" not found`);
    }

    // Extract isActive from DTO and update the attribute
    const { isActive } = UpdateIsActiveDto;
    offer.isActive = isActive;

    // Save the updated offer
    return await this.OfferRepository.save(offer);
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // async remove(id: string): Promise<void> {
  //   const offer = await this.findOne(id);
  //   await this.OfferRepository.remove(offer);
  // }
  async remove(offerId: string, userId: string): Promise<void> {
    const offer = await this.OfferRepository.findOne({
      where: { id: offerId },
    }); // Ensure this method is used correctly

    if (!offer) {
      throw new NotFoundException(`Offer with ID "${offerId}" not found`);
    }

    offer.deletedAt = new Date();

    await this.entityManager.transaction(async (transactionalEntityManager) => {
      try {
        // Save the offer with soft delete
        await transactionalEntityManager.save(OfferEntity, offer);

        // Create an audit log entry for the soft delete
        const auditLog = new AuditLogEntity();
        auditLog.tableName = "offer";
        auditLog.action = "DELETE";
        auditLog.entityId = offerId;
        auditLog.performedBy = userId;

        // Fetch user details if needed
        if (userId) {
          const user = await this.UserRepository.findOne({
            where: { id: userId },
          });
          if (user) {
            auditLog.userDetails = {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
            };
          }
        }

        await transactionalEntityManager.save(AuditLogEntity, auditLog);
      } catch (error) {
        console.error(
          "Error performing soft delete and creating audit log:",
          error,
        );
        throw new InternalServerErrorException("Failed to soft delete offer");
      }
    });
  }
}
