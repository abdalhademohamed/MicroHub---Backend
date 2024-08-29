import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateOfferDto } from './dto/create.offer.dto';
import { UpdateOfferDto } from './dto/update.offer.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { OfferEntity } from './entities/offer.entity';
import { ServiceEntity } from '../service/entities/service.entity';
import { BranchEntity } from '../branch/entities/branch.entity';
import { In, MoreThan, Repository } from 'typeorm';
import { UpdateIsActiveDto } from './dto/update.active.dto';

@Injectable()
export class OfferService {



  constructor(
    @InjectRepository(OfferEntity)
    private OfferRepository: Repository<OfferEntity>,

    @InjectRepository(ServiceEntity)
    private ServiceRepository: Repository<ServiceEntity>,

    @InjectRepository(BranchEntity)
    private BranchRepository: Repository<BranchEntity>,
  ) {}
  async create(createOfferDto: CreateOfferDto): Promise<OfferEntity> {
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
      throw new BadRequestException('End date must be after the start date');
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

    return await this.OfferRepository.save(offer);
  }
  async findAll(page: number = 1, limit: number = 10): Promise<{ items: OfferEntity[], total: number }> {
    try {
      // Validate pagination parameters
      if (page < 1 || limit < 1) {
        throw new BadRequestException('Pagination parameters must be positive integers');
      }

      // Retrieve paginated results
      const [results, total] = await this.OfferRepository.findAndCount({
        relations: ['services', 'branches'],
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
        throw new InternalServerErrorException('An error occurred while retrieving offers');
      }
    }
  }

  async findActiveOffers(): Promise<OfferEntity[]> {
    const now = new Date();
    return await this.OfferRepository.find({
      where: {
        endDateTime: MoreThan(now),
      },
      relations: ['services', 'branches'],
    });
  }
  
  async findOne(id: string): Promise<OfferEntity> {
    const offer = await this.OfferRepository.findOne({
      where: { id },
      relations: ['services', 'branches'],
    });
  
    if (!offer) {
      throw new NotFoundException(`Offer with ID "${id}" not found`);
    }
    
    return offer;
  }
  async update(id: string, updateOfferDto: UpdateOfferDto): Promise<OfferEntity> {
    const offer = await this.findOne(id);

    const { serviceIds, branchIds, ...offerData } = updateOfferDto;

    const services = serviceIds ? await this.ServiceRepository.findByIds(serviceIds) : offer.services;
    const branches = branchIds ? await this.BranchRepository.findByIds(branchIds) : offer.branches;

    Object.assign(offer, offerData, { services, branches });

    return await this.OfferRepository.save(offer);
  }


  async updateIsActive(id: string, UpdateIsActiveDto: UpdateIsActiveDto): Promise<OfferEntity> {
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
  async remove(id: string): Promise<void> {
    const offer = await this.findOne(id);
    await this.OfferRepository.remove(offer);
  }
}
