import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { CreateSharableOfferDto } from "./dto/create-sharable-offer.dto";
import { UpdateSharableOfferDto } from "./dto/update-sharable-offer.dto";
import { SharableOfferEntity } from "./entities/sharable-offer.entity";
import { EntityManager, In, MoreThan, Repository } from "typeorm";
import { InjectEntityManager, InjectRepository } from "@nestjs/typeorm";
import { ServiceEntity } from "../service/entities/service.entity";
import { BranchEntity } from "../branch/entities/branch.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { UserEntity } from "../user/entities/user.entity";

@Injectable()
export class SharableOfferService {
  constructor(
    @InjectRepository(SharableOfferEntity)
    private readonly sharableOfferRepository: Repository<SharableOfferEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectEntityManager() private readonly entityManager: EntityManager,
    @InjectRepository(UserEntity)
    private readonly UserRepository: Repository<UserEntity>

  ) {}

  async createSharableOffer(
    createSharableOfferDto: CreateSharableOfferDto
  ): Promise<SharableOfferEntity> {
    const { serviceIds, branchIds, ...offerData } = createSharableOfferDto;

    //  // Parse and format the date strings using date-fns
    //  const formattedStartDateTime = formatISO(parseISO(startDateTime));
    //  const formattedEndDateTime = formatISO(parseISO(endDateTime));
    // Find services by IDs using In operator
    const services = await this.serviceRepository.findBy({
      id: In(serviceIds),
    });

    // Ensure that services were found
    if (services.length === 0) {
      throw new Error("No services found with the provided IDs.");
    }

    const branches = await this.branchRepository.find({
      where: { id: In(branchIds) },
    });

    // Ensure that the branch exists
    if (!branches || branches.length === 0) {
      throw new NotFoundException(`Branch with ID(s) "${branchIds}" not found`);
    }
    //  // Validate date range
    //  if (new Date(offerData.startDateTime) >= new Date(offerData.endDateTime)) {
    //   throw new BadRequestException("End date must be after the start date");
    // }
    const currentday = new Date();
    currentday.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    const offerStartDay = new Date(offerData.startDateTime);
    const offerEndDay = new Date(offerData.endDateTime);

    if (offerStartDay < currentday) {
      throw new BadRequestException("Start date cannot be before today");
    }
    if (offerStartDay >= offerEndDay) {
      throw new BadRequestException("End date must be after the start date");
    }
    // Determine if the offer should be active based on the start date
    const today = new Date();
    const startDateTime = new Date(offerData.startDateTime);
    const isActive = today.toDateString() === startDateTime.toDateString();
    // Create the new offer
    const sharableOffer = this.sharableOfferRepository.create({
      ...offerData,
      services,
      branches, // Assign the single branch
      isActive,
    });


    // Save to the database 
    return await this.sharableOfferRepository.save(sharableOffer);

    

  }

  async findActiveSharableOffer(): Promise<SharableOfferEntity[]> { 
    const now = new Date();
    return await this.sharableOfferRepository.find({
      where: {
        endDateTime: MoreThan(now),
        isActive: true, // Ensure the offer is active
      },
      relations: ["services", "branches"], // Make sure to specify 'branches' not 'branch'
    });
  }
  async findAllSharableOffers(): Promise<SharableOfferEntity[]> {
    return await this.sharableOfferRepository.find({
      relations: ["services", "branches"], // Include related services and branch
    });
  }

  // Method to count all and active sharable offers
  async countSharableOffers(): Promise<{ total: number; active: number }> {
    const [total, active] = await Promise.all([
      this.sharableOfferRepository.count(), // Count all offers
      this.sharableOfferRepository.count({ where: { isActive: true } }), // Count active offers
    ]);

    return { total, active };
  }


  async updateIsActive(
    id: string,
    isActive: boolean  ): Promise<SharableOfferEntity> {
    // Fetch the offer by ID
    const offer = await this.sharableOfferRepository.findOneBy({ id });

    // Handle cases where the offer is not found
    if (!offer) {
      throw new NotFoundException(`Offer with ID "${id}" not found`);
    }

    // Extract isActive from DTO and update the attribute
    offer.isActive = isActive;

    // Save the updated offer
    return await this.sharableOfferRepository.save(offer);
  }




  async update(
    sharableOfferId: string,
    UpdateSharableOfferDto: UpdateSharableOfferDto,
    userId: string
  ): Promise<SharableOfferEntity> {
    const sharableOffer = await this.sharableOfferRepository.findOne({
      where: { id: sharableOfferId },
    }); // Ensure this method is used correctly

    if (!sharableOffer) {
      throw new NotFoundException(`Offer with ID "${sharableOfferId}" not found`);
    }

    const { serviceIds, branchIds, ...sharableOfferData } = UpdateSharableOfferDto;

    // Fetch new services and branches if provided, otherwise keep existing ones
    const services = serviceIds
      ? await this.serviceRepository.findByIds(serviceIds)
      : sharableOffer.services;
    const branches = branchIds
      ? await this.branchRepository.findByIds(branchIds)
      : sharableOffer.branches;

    // Update offer entity with new data
    Object.assign(sharableOffer, sharableOfferData, { services, branches, updatedBy: userId });

    let updatedOffer: SharableOfferEntity;

    await this.entityManager.transaction(async (transactionalEntityManager) => {
      try {
        // Save the updated offer
        updatedOffer = await transactionalEntityManager.save(
          SharableOfferEntity,
          sharableOffer
        );

        // Create an audit log entry for the update
        const auditLog = new AuditLogEntity();
        auditLog.tableName = "offer";
        auditLog.action = "UPDATE";
        auditLog.entityId = updatedOffer.id;
        auditLog.performedBy = userId;

        // Collect changes details
        const oldOffer = await transactionalEntityManager.findOne(SharableOfferEntity, {
          where: { id: updatedOffer.id },
        });
        const changedColumns = Object.keys(sharableOfferData);
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
}
