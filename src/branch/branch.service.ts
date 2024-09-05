import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateBranchDto } from './dto/create.branch.dto';
import { UpdateBranchDto } from './dto/update.branch.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchEntity } from './entities/branch.entity';
import { PaginateResultDto } from './dto/paginate.result.dto';
import { create } from 'domain';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { I18nService } from 'nestjs-i18n';
import { ReservationEntity } from 'src/reservation/entities/reservation.entity';
import { WorkingBranchEntity } from 'src/working-branch/entities/working.branch.entity';
import { WeekDays } from './utils/days.enum';

@Injectable()
export class BranchService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly BranchRepository: Repository<BranchEntity>,
    private readonly CloudinaryService: CloudinaryService,
    @InjectRepository(ReservationEntity)
    private readonly ReservationRepository: Repository<ReservationEntity>,
    @InjectRepository(WorkingBranchEntity)
    private readonly WorkingBranchRepository: Repository<WorkingBranchEntity>,


  ) {}

  async createBranch(createBranchDto: CreateBranchDto): Promise<BranchEntity> {
    const { name, location, image } = createBranchDto;
  
    try {
      // Check if the branch already exists
      const existingBranch = await this.BranchRepository.findOne({
        where: [{ name }, { location }],
      });
  
      if (existingBranch) {
        throw new ConflictException(
          'A branch with the given name or location already exists.',
        );
      }
  
      // Create and save the new branch
      const branch = this.BranchRepository.create({ name, location, image });
      return await this.BranchRepository.save(branch);
    } catch (error) {
      // Handle specific errors
      if (error instanceof ConflictException) {
        // ConflictException will automatically send status code 409
        throw error;
      }
  
      // Handle unexpected errors
      // InternalServerErrorException will automatically send status code 500
      throw new InternalServerErrorException(
        'An unexpected error occurred while creating the branch.',
      );
    }
  }




  // async createWorkingHours(createBranchWorkingHoursDto: CreateBranchWorkingHoursDto): Promise<void> {
  //   const { branchId, dayOfWeek, workingHours } = createBranchWorkingHoursDto;

  //   // Find the branch by ID
  //   const branch = await this.BranchRepository.findOne({ where: { id: branchId }});
  //   if (!branch) {
  //     throw new NotFoundException(`Branch with ID ${branchId} not found`);
  //   }

  //   // Check if there's already a schedule for the given day
  //   // let schedule = branch.schedules.find(s => s.dayOfWeek === dayOfWeek);

  //   // if (schedule) {
  //   //   // Update existing schedule
  //   //   schedule.workingHours = workingHours;
  //   // } else {
  //     // Create a new schedule
  //    const schedule = this.BranchRepository.create({
  //       dayOfWeek,
  //       workingHours,
  //       branch,
  //     });
  //     branch.schedules.push(schedule);
  //   // }

  //   await this.branchScheduleRepository.save(schedule);
  //   console.log(`Created/Updated working hours for Branch ID: ${branchId} on ${dayOfWeek}`);
  // }

  async getBranches(
    page: number,
    limit: number,
  ): Promise<PaginateResultDto<BranchEntity>> {
    const [items, total] = await this.BranchRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    }); 

    return {
      items,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBranchCalendar(
    branchId: string,
    dayOfWeek: string, // String representation of the day of the week
    date: string, // Date in string format (e.g., '2024-09-05')
  ): Promise<{
    branch: {
      id: string;
      name: string;
      location: string;
      image: string;
    };
    workingHours: string[];
    reservations: ReservationEntity[];
  }> {
    // Fetch the branch entity to ensure it exists
    const branch = await this.BranchRepository.findOne({
      where: { id: branchId },
    });
  
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  
    // Convert dayOfWeek string to WeekDays enum
    const weekDayEnum = WeekDays[dayOfWeek as keyof typeof WeekDays];
  
    if (!weekDayEnum) {
      throw new BadRequestException('Invalid day of the week');
    }
  
    // Find the working branch entity for the given day
    const workingBranch = await this.WorkingBranchRepository.findOne({
      where: {
        branch: { id: branchId },
        dayOfWeek: weekDayEnum,
      },
    });
  
    // Convert date string to Date object
    const dateObj = new Date(date);
    const reservationDay = dateObj.getDate();
    const reservationMonth = dateObj.getMonth() + 1; // Months are 0-indexed
    const reservationYear = dateObj.getFullYear();
  
    // Fetch reservations for the specified branch and date
    const reservations = await this.ReservationRepository.find({
      where: {
        branch: { id: branchId },
        reservationDay,
        reservationMonth,
        reservationYear,
      },
      order: {
        start_Time: 'ASC', // Optional: sort reservations by start time
      },
    });
  
    // Return branch details, working hours, and reservations
    return {
      branch: {
        id: branch.id,
        name: branch.name,
        location: branch.location,
        image: branch.image,
      },
      workingHours: workingBranch ? workingBranch.workingHours : [],
      reservations,
    };
  }
  async uploadImage(file: Express.Multer.File,folderName:string): Promise<string> {
    const result = await this.CloudinaryService.uploadImage(file,folderName);
    return result.url;  // Return the URL of the uploaded image
  }
  async deleteBranch(branchId: string): Promise<void> {
    try {
      // Find the branch by ID
      const branch = await this.BranchRepository.findOne({ where: { id: branchId } });

      if (!branch) {
        throw new NotFoundException(`Branch with ID ${branchId} not found.`);
      }

      // Delete the branch
      await this.BranchRepository.delete(branchId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'An unexpected error occurred while deleting the branch.',
      );
    }
  }
  
}
