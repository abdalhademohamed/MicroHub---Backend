import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSharableOfferDto } from './dto/create-sharable-offer.dto';
import { UpdateSharableOfferDto } from './dto/update-sharable-offer.dto';
import { SharableOfferEntity } from './entities/sharable-offer.entity';
import { In, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ServiceEntity } from '../service/entities/service.entity';
import { BranchEntity } from '../branch/entities/branch.entity';
import { formatISO, parseISO } from 'date-fns';

@Injectable()
export class SharableOfferService {
  constructor(
    @InjectRepository(SharableOfferEntity)
    private readonly sharableOfferRepository: Repository<SharableOfferEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
  ) {}

  async createSharableOffer(createSharableOfferDto: CreateSharableOfferDto): Promise<SharableOfferEntity> {
    const { serviceIds, branchId, ...offerData } = createSharableOfferDto;
  
    //  // Parse and format the date strings using date-fns
    //  const formattedStartDateTime = formatISO(parseISO(startDateTime));
    //  const formattedEndDateTime = formatISO(parseISO(endDateTime));
    // Find services by IDs using In operator
    const services = await this.serviceRepository.findBy({ id: In(serviceIds) });
  
    // Ensure that services were found
    if (services.length === 0) {
      throw new Error('No services found with the provided IDs.');
    }
  
    // Find the branch by ID (assuming you have a repository for branches)
    const branch = await this.branchRepository.findOne({ where: { id: branchId } });
  
    // Ensure that the branch exists
    if (!branch) {
      throw new Error('Branch not found.');
    }
   // Validate date range
   if (new Date(offerData.startDateTime) >= new Date(offerData.endDateTime)) {
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
      branch, // Assign the single branch
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
      relations: ["services", "branch"],
    });
  }
  
  async findAllSharableOffers(): Promise<SharableOfferEntity[]> {
    return await this.sharableOfferRepository.find({
      relations: ['services', 'branch'], // Include related services and branch
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

}