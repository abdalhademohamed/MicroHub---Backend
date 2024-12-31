import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CreateSharableOfferDto } from "./dto/create-sharable-offer.dto";
import { UpdateSharableOfferDto } from "./dto/update-sharable-offer.dto";
import { SharableOfferEntity } from "./entities/sharable-offer.entity";
import { EntityManager, In, MoreThan, Repository } from "typeorm";
import { InjectEntityManager, InjectRepository } from "@nestjs/typeorm";
import { ServiceEntity } from "../service/entities/service.entity";
import { BranchEntity } from "../branch/entities/branch.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { UserEntity } from "../user/entities/user.entity";
import { CustomI18nService } from "../common/custom.18n.service";
import { I18nService } from "nestjs-i18n";

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
    private readonly UserRepository: Repository<UserEntity>,
    private readonly i18n: CustomI18nService,
  ) {}

  async createSharableOffer(
    createSharableOfferDto: CreateSharableOfferDto,
  ): Promise<SharableOfferEntity> {
    const { serviceIds, branchIds, ...offerData } = createSharableOfferDto;

    const services = await this.serviceRepository.findBy({
      id: In(serviceIds),
    });

    if (services.length === 0) {
      throw new NotFoundException(
        this.i18n.translate("test.SHARABLE_OFFER.SERVICES_NOT_FOUND"),
      );
    }

    const branches = await this.branchRepository.find({
      where: { id: In(branchIds) },
    });

    if (!branches || branches.length === 0) {
      throw new NotFoundException(
        this.i18n.translate("test.SHARABLE_OFFER.BRANCHES_NOT_FOUND", {
          args: { branchIds },
        }),
      );
    }

    const currentday = new Date();
    currentday.setHours(0, 0, 0, 0);
    const offerStartDay = new Date(offerData.startDateTime);
    const offerEndDay = new Date(offerData.endDateTime);

    if (offerStartDay < currentday) {
      throw new BadRequestException(
        this.i18n.translate("test.SHARABLE_OFFER.INVALID_START_DATE"),
      );
    }
    if (offerStartDay >= offerEndDay) {
      throw new BadRequestException(
        this.i18n.translate("test.SHARABLE_OFFER.INVALID_DATE_RANGE"),
      );
    }

    const today = new Date();
    const startDateTime = new Date(offerData.startDateTime);
    const isActive = today.toDateString() === startDateTime.toDateString();

    const sharableOffer = this.sharableOfferRepository.create({
      ...offerData,
      services,
      branches,
      isActive,
    });

    try {
      return await this.sharableOfferRepository.save(sharableOffer);
    } catch (error) {
      throw new InternalServerErrorException(
        this.i18n.translate("test.SHARABLE_OFFER.CREATE_FAILED"),
      );
    }
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
    isActive: boolean,
  ): Promise<SharableOfferEntity> {
    // Fetch the offer by ID
    const offer = await this.sharableOfferRepository.findOneBy({ id });

    // Handle cases where the offer is not found
    if (!offer) {
      throw new NotFoundException(
        this.i18n.translate("test.SHARABLE_OFFER.NOT_FOUND", { args: { id } }),
      );
    }

    // Extract isActive from DTO and update the attribute
    offer.isActive = isActive;

    try {
      return await this.sharableOfferRepository.save(offer);
    } catch (error) {
      throw new InternalServerErrorException(
        this.i18n.translate("test.SHARABLE_OFFER.UPDATE_FAILED"),
      );
    }
  }

  async update(
    sharableOfferId: string,
    UpdateSharableOfferDto: UpdateSharableOfferDto,
    userId: string,
  ): Promise<SharableOfferEntity> {
    const sharableOffer = await this.sharableOfferRepository.findOne({
      where: { id: sharableOfferId },
    }); // Ensure this method is used correctly

    if (!sharableOffer) {
      throw new NotFoundException(
        this.i18n.translate("test.SHARABLE_OFFER.NOT_FOUND", {
          args: { id: sharableOfferId },
        }),
      );
    }

    const { serviceIds, branchIds, ...sharableOfferData } =
      UpdateSharableOfferDto;

    // Fetch new services and branches if provided, otherwise keep existing ones
    const services = serviceIds
      ? await this.serviceRepository.findByIds(serviceIds)
      : sharableOffer.services;
    const branches = branchIds
      ? await this.branchRepository.findByIds(branchIds)
      : sharableOffer.branches;

    // Update offer entity with new data
    Object.assign(sharableOffer, sharableOfferData, {
      services,
      branches,
      updatedBy: userId,
    });

    let updatedOffer: SharableOfferEntity;

    await this.entityManager.transaction(async (transactionalEntityManager) => {
      try {
        // Save the updated offer
        updatedOffer = await transactionalEntityManager.save(
          SharableOfferEntity,
          sharableOffer,
        );

        // Create an audit log entry for the update
        const auditLog = new AuditLogEntity();
        auditLog.tableName = "offer";
        auditLog.action = "UPDATE";
        auditLog.entityId = updatedOffer.id;
        auditLog.performedBy = userId;

        // Collect changes details
        const oldOffer = await transactionalEntityManager.findOne(
          SharableOfferEntity,
          {
            where: { id: updatedOffer.id },
          },
        );
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
        throw new InternalServerErrorException(
          this.i18n.translate("test.SHARABLE_OFFER.UPDATE_FAILED"),
        );
      }
    });

    return updatedOffer;
  }
}
