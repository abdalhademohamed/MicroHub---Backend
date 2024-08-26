import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ReservationEntity } from './entities/reservation.entity';
import { BranchEntity } from '../branch/entities/branch.entity';
import { ServiceEntity } from '../service/entities/service.entity';
import { CreateReservationDto } from './dto/create.reservation.dto';
import { GetReservationsDto } from './dto/get.reservation.dto';
import { UpdateReservationDto } from './dto/update.reservation.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CustomerEntity } from '../customer/entities/customer.entity';
import { CreateCustomerDto } from '../customer/dto/create-customer.dto';


@Injectable()
export class ReservationService {
  
  constructor(

    @InjectRepository(ReservationEntity)
    private readonly ReservationRepository: Repository<ReservationEntity>,

    @InjectRepository(BranchEntity)
    private readonly BranchRepository: Repository<BranchEntity>,

    @InjectRepository(ServiceEntity)
    private readonly ServiceRepository: Repository<ServiceEntity>,


    private readonly CloudinaryService: CloudinaryService,

    @InjectRepository(CustomerEntity)
    private readonly CustomerRepository: Repository<CustomerEntity>,
  ) {}

  // async createReservation(createReservationDto: CreateReservationDto): Promise<ReservationEntity> {
  //   const {
  //     country_Code,
  //     phone_Number,
  //     client_FullName,
  //     day,
  //     month,
  //     year,
  //     branch,
  //     services: serviceIds,
  //     deposit_Content,
  //   } = createReservationDto;

  //   // Check if the branch exists
  //   const existingbranch = await this.BranchRepository.findOne({ where: { id :branch.id} });
  //   if (!existingbranch) {
  //     throw new NotFoundException('Branch not found');
  //   }

  //   // Retrieve and verify services
  //  const services = await this.ServiceRepository.find({
  //    where: {
  //      id: In(serviceIds),
  //    },
  //    relations: ['rootosh'], // Include the rootosh relationship

  //  });
  //   if (services.length !== serviceIds.length) {
  //     throw new NotFoundException('One or more services not found');
  //   }

   

  //   // Create the reservation
  //   const newReservation = this.ReservationRepository.create({
  //     country_Code,
  //     phone_Number,
  //     client_FullName,
  //     day,
  //     month,
  //     year,
  //     reservation_Time_From,
  //     reservation_Time_To,
  //     branch,
  //     services, 
  //     deposit_Content
  //   });

  //   try {
  //     // Save the reservation
  //     return await this.ReservationRepository.save(newReservation);
  //   } catch (error) {
  //     // console.log(error.stack)
  //     throw new InternalServerErrorException('Failed to create reservation');
  //   }
  // }



  async selectBranch(branchId: string): Promise<BranchEntity> {
    // Find the branch by ID
    const branch = await this.BranchRepository.findOne({ where: { id: branchId } });
  
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  
    return branch;
  }

  async registerOrLookupCustomer(createCustomerDto: CreateCustomerDto): Promise<CustomerEntity> {
    const { countryCode, phoneNumber, fullName,
       day, month, year 
      } = createCustomerDto;
  
    // Check if customer exists by phone number
    let customer = await this.CustomerRepository.findOne({
      where: { phoneNumber },
      relations: ['lastServices', 'lastRootoshes'], // Ensure relation names are correct
    });
  
    if (!customer) {
      // Register new customer
      customer = this.CustomerRepository.create({ countryCode, phoneNumber, fullName,
         day, month, year });
      await this.CustomerRepository.save(customer);
    }
  
    return customer;
  }
  async selectServices(servicesIds: string[]): Promise<ServiceEntity[]> {
    const services = await this.ServiceRepository.find({
      where: { id: In(servicesIds) }, // Ensure you're using the correct operator here
      relations: ['rootosh'], // Load the related rootoshes
    });
  
    if (services.length === 0) {
      throw new BadRequestException('No valid services found');
    }
  
    return services;
  }



  private calculateTotalDuration(services: ServiceEntity[]): number {
      return services.reduce((total, service) => total + service.duration_Mins, 0);
  }
 
  async findNearestAvailableSlot(
    branchId: string,
    totalDuration: number,
  ): Promise<{ reservationDay: number; reservationMonth: number; reservationYear: number; start_Time: string; end_Time: string }> {
    const now = new Date();
    const branch = await this.BranchRepository.findOne({ where: { id: branchId }, relations: ['reservations'] });
  
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  
    const reservations = branch.reservations
      .filter(reservation => {
        const reservationStart = new Date(reservation.reservationYear, reservation.reservationMonth - 1, reservation.reservationDay, 
                                           +reservation.start_Time.split(':')[0], +reservation.start_Time.split(':')[1]);
        return reservationStart >= now; // Filter out past reservations
      })
      .sort((a, b) => {
        const dateA = new Date(a.reservationYear, a.reservationMonth - 1, a.reservationDay, 
                               +a.start_Time.split(':')[0], +a.start_Time.split(':')[1]);
        const dateB = new Date(b.reservationYear, b.reservationMonth - 1, b.reservationDay, 
                               +b.start_Time.split(':')[0], +b.start_Time.split(':')[1]);
        return dateA.getTime() - dateB.getTime();
      });
  
    let suggestedSlot = this.findGapInReservations(now, reservations, totalDuration);
  
    if (!suggestedSlot) {
      // Search for available slots in future dates
      const futureDate = new Date(now);
      futureDate.setMonth(futureDate.getMonth() + 1); // Search one month ahead
  
      while (futureDate <= futureDate) {
        suggestedSlot = this.findGapInReservations(futureDate, reservations, totalDuration);
        if (suggestedSlot) {
          return suggestedSlot;
        }
        futureDate.setDate(futureDate.getDate() + 1); // Move to the next day
      }
  
      throw new BadRequestException('No available time slots in the extended future');
    }
  
    return suggestedSlot;
  }
  


private findGapInReservations(
  now: Date,
  reservations: ReservationEntity[],
  totalDuration: number,
): { reservationDay: number; reservationMonth: number; reservationYear: number; start_Time: string; end_Time: string } | null {
  let lastEndTime = now;

  // Sort reservations by date and time
  reservations.sort((a, b) => {
    const dateA = new Date(a.reservationYear, a.reservationMonth - 1, a.reservationDay, 
                           +a.start_Time.split(':')[0], +a.start_Time.split(':')[1]);
    const dateB = new Date(b.reservationYear, b.reservationMonth - 1, b.reservationDay, 
                           +b.start_Time.split(':')[0], +b.start_Time.split(':')[1]);
    return dateA.getTime() - dateB.getTime();
  });

  for (const reservation of reservations) {
    const reservationStartTime = new Date(reservation.reservationYear, reservation.reservationMonth - 1, reservation.reservationDay, 
                                          +reservation.start_Time.split(':')[0], +reservation.start_Time.split(':')[1]);

    const gapMinutes = (reservationStartTime.getTime() - lastEndTime.getTime()) / (1000 * 60);

    if (gapMinutes >= totalDuration) {
      return this.createTimeSlotFromGap(lastEndTime, totalDuration);
    }

    const reservationEndTime = new Date(reservation.reservationYear, reservation.reservationMonth - 1, reservation.reservationDay, 
                                        +reservation.end_Time.split(':')[0], +reservation.end_Time.split(':')[1]);
    lastEndTime = reservationEndTime;
  }

  return this.createTimeSlotFromGap(lastEndTime, totalDuration);
}

private createTimeSlotFromGap(
  startDate: Date,
  totalDuration: number,
): { reservationDay: number; reservationMonth: number; reservationYear: number; start_Time: string; end_Time: string } {
  const endTime = new Date(startDate.getTime() + totalDuration * 60 * 1000);

  return {
    reservationDay: startDate.getDate(),
    reservationMonth: startDate.getMonth() + 1,
    reservationYear: startDate.getFullYear(),
    start_Time: `${startDate.getHours()}:${startDate.getMinutes().toString().padStart(2, '0')}`,
    end_Time: `${endTime.getHours()}:${endTime.getMinutes().toString().padStart(2, '0')}`,
  };
}



async manuallySelectTimeSlot(
    branchId: string,
    services: ServiceEntity[],
    manualDate: { reservationDay: number; reservationMonth: number; reservationYear: number },): Promise<{ reservationDay: number; reservationMonth: number; reservationYear: number; start_Time: string; end_Time: string }> {
    const totalDuration = this.calculateTotalDuration(services);

    const availableSlot = await this.findNearestAvailableSlot(branchId, totalDuration);

    if (availableSlot) {
      // Implement logic for manual selection and validation if needed
      return availableSlot;
    } else {
      throw new BadRequestException('No available time slots for the manual date selected');
    }
}

















// Function to validate manual date availability
private async checkManualDateAvailability(
  branchId: string,
  manualDate: { reservationDay: number; reservationMonth: number; reservationYear: number },
  totalDuration: number
): Promise<{ reservationDay: number; reservationMonth: number; reservationYear: number; start_Time: string; end_Time: string } | null> {
  const branch = await this.BranchRepository.findOne({ where: { id: branchId }, relations: ['reservations'] });

  if (!branch) {
    throw new NotFoundException('Branch not found');
  }

  const reservations = branch.reservations;

  // Check availability for the manually specified date
  const manualDateStart = new Date(manualDate.reservationYear, manualDate.reservationMonth - 1, manualDate.reservationDay);
  const manualDateEnd = new Date(manualDateStart.getTime() + totalDuration * 60 * 1000);

  for (const reservation of reservations) {
    const reservationStart = new Date(reservation.reservationYear, reservation.reservationMonth - 1, reservation.reservationDay, 
                                       +reservation.start_Time.split(':')[0], +reservation.start_Time.split(':')[1]);
    const reservationEnd = new Date(reservation.reservationYear, reservation.reservationMonth - 1, reservation.reservationDay, 
                                     +reservation.end_Time.split(':')[0], +reservation.end_Time.split(':')[1]);

    // Check if the manual date slot overlaps with any existing reservation
    if (manualDateStart < reservationEnd && manualDateEnd > reservationStart) {
      // Overlaps with an existing reservation; not available
      return null;
    }
  }

  // Manual date slot is available
  return {
    reservationDay: manualDate.reservationDay,
    reservationMonth: manualDate.reservationMonth,
    reservationYear: manualDate.reservationYear,
    start_Time: manualDateStart.toTimeString().slice(0, 5), // Format HH:MM
    end_Time: manualDateEnd.toTimeString().slice(0, 5) // Format HH:MM
  };
}


  



  
  
async createReservation(
  branchId: string,
  createCustomerDto: CreateCustomerDto,
  servicesIds: string[],
  manualDate?: { reservationDay: number; reservationMonth: number; reservationYear: number },
): Promise<{ reservation: ReservationEntity; receipt: string }> {
  // Select the branch
  const branch = await this.selectBranch(branchId);

  // Register or lookup customer
  const customer = await this.registerOrLookupCustomer(createCustomerDto);

  // Select services
  const services = await this.selectServices(servicesIds);
  const totalDuration = this.calculateTotalDuration(services);

  // Find nearest available slot
  let slot: { reservationDay: number; reservationMonth: number; reservationYear: number; start_Time: string; end_Time: string };

  try {
    slot = await this.findNearestAvailableSlot(branchId, totalDuration);    
  } catch (error) {
    throw new BadRequestException('No available time slots in the near future');
  }

  // If manual date provided, check availability for manual date
  if (manualDate) {
    const manualSlot = await this.checkManualDateAvailability(branchId, manualDate, totalDuration);
    
    if (manualSlot) {
      slot = manualSlot; // Use manual date slot if available
    }
  }



  
  // Create the reservation
  const reservation = this.ReservationRepository.create({
    
    country_Code: customer.countryCode,
    phone_Number: customer.phoneNumber,
    client_FullName: customer.fullName,
    day: createCustomerDto.day,
    month: createCustomerDto.month,
    year: createCustomerDto.year,
    ...slot,
    deposit_Content: null,
    branch,
    services,
  });

  await this.ReservationRepository.save(reservation);

  // Collect all rootoshes from the services
  const rootoshes = services.flatMap(service => service.rootosh);

  // Update the customer's last services and rootoshes
  customer.lastServices = services;
  customer.lastRootoshes = rootoshes;

  // Save the updated customer
  await this.CustomerRepository.save(customer);


  // Generate receipt
  const receipt = `Receipt:\nCustomer: ${customer.fullName}\nDate: ${slot.reservationDay}/${slot.reservationMonth}/${slot.reservationYear}\nStart Time: ${slot.start_Time}\nEnd Time: ${slot.end_Time}\nTotal Duration: ${totalDuration} minutes\n`;

  return { reservation, receipt };
}

  
  
  
  
  
  
  
  

// async uploadDepositImage(imageFile: any): Promise<string> {
//       const filename = '';
//       const result = await this.CloudinaryService.uploadImage(imageFile,filename);
//       if (!result.url) {
//         throw new BadRequestException('Failed to upload image');
//       }
//       return result.url;
// }
  
  
  
  
  
  
  
  
  
  
async getAllReservations(getReservationsDto: GetReservationsDto): Promise<{data: ReservationEntity[]; total: number;page: number;limit: number;
  }> {
    const {
      day,
      month,
      year,
      page = 1,
      limit = 10,
    } = getReservationsDto;

    const query = this.ReservationRepository.createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.branch', 'branch')
      .leftJoinAndSelect('reservation.services', 'services');

    // Apply filters
    if (day) {
      query.andWhere('reservation.day = :day', { day });
    }
    if (month) {
      query.andWhere('reservation.month = :month', { month });
    }
    if (year) {
      query.andWhere('reservation.year = :year', { year });
    }

    // Apply pagination
    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
}


async updateReservation(id: string, updateReservationDto: UpdateReservationDto): Promise<ReservationEntity> {
    const reservation = await this.ReservationRepository.findOne({
      where: { id },
      relations: ['branch', 'services'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    try {
      // Update the reservation details
      this.ReservationRepository.merge(reservation, updateReservationDto);
      return await this.ReservationRepository.save(reservation);
    } catch (error) {
      throw new InternalServerErrorException('Failed to update reservation');
    }
}



async deleteReservation(id: string): Promise<void> {
    const reservation = await this.ReservationRepository.findOne({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    // Delete the reservation
    await this.ReservationRepository.remove(reservation);
}



async uploadImageAndAssociateWithReservation(
    reservationId: string,
    image: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    if (!image) {
      throw new BadRequestException('Photo is required');
    }
  
    // Check if the reservation exists
    const reservation = await this.ReservationRepository.findOne({where:{id:reservationId}});
    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${reservationId} not found.`);
    }
  
    const folderName = 'reservation'; // or any other dynamic name based on context

    // Logic to upload image to Cloudinary or another storage service
    const uploadResult = await this.CloudinaryService.uploadImage(image, folderName);
  
    // Update the reservation entity with the image URL
    reservation.deposit_Content = uploadResult.url;
  
    // Save the updated reservation
    await this.ReservationRepository.save(reservation);
  
    return { imageUrl: uploadResult.url };
}
  
}
