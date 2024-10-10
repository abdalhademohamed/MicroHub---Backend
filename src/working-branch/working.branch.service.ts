import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CreateWorkingBranchDto } from "./dto/create.working.branch.dto";
import { UpdateWorkingBranchDto } from "./dto/update.working.branch.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { BranchEntity } from "../branch/entities/branch.entity";
import { FindOptionsWhere, QueryFailedError, Repository } from "typeorm";
import { WorkingBranchEntity } from "./entities/working.branch.entity";
import { WeekDays } from "../branch/utils/days.enum";
import { SlotService } from "../slots/slots.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Postion } from "../postion/utils/postion.enum";

@Injectable()
export class WorkingBranchService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,

    @InjectRepository(WorkingBranchEntity)
    private readonly WorkingBranchsRepository: Repository<WorkingBranchEntity>,

    private slotService: SlotService
    // private eventEmitter: EventEmitter2,
  ) {}

  // async createWorkingBranch(
  //   branchId: string,
  //   createWorkingBranchDto: CreateWorkingBranchDto,
  // ): Promise<{ id: string; dayOfWeek: string; workingHours: string[] }> {
  //   const { dayOfWeek, workingHours } = createWorkingBranchDto;

  //   // Convert dayOfWeek from string to WeekDays enum
  //   const weekDayEnum = WeekDays[dayOfWeek as keyof typeof WeekDays];
  //   if (!weekDayEnum) {
  //     throw new BadRequestException({
  //       error: 'InvalidDayOfWeek',
  //       message: `Invalid dayOfWeek: ${dayOfWeek}`,
  //     });
  //   }

  //   // Fetch the branch with the related working branches and employees
  //   let branch;
  //   try {
  //     branch = await this.branchRepository.findOne({
  //       where: { id: branchId },
  //       relations: ['workingbranch', 'employees', 'employees.position'],
  //     });
  //   } catch (error) {
  //     console.error('Error fetching branch:', error);
  //     throw new HttpException({
  //       error: 'BranchFetchError',
  //       message: 'An error occurred while fetching the branch. Please try again later.',
  //     }, HttpStatus.INTERNAL_SERVER_ERROR);
  //   }

  //   if (!branch) {
  //     throw new NotFoundException({
  //       error: 'BranchNotFound',
  //       message: `Branch with ID ${branchId} not found`,
  //     });
  //   }

  //   // Check if there is at least one employee with the position of "Artist"
  //   const hasArtist = branch.employees.some(
  //     (employee) => employee.position?.postion === Postion.ARTIST,
  //   );

  //   if (!hasArtist) {
  //     throw new BadRequestException({
  //       error: 'ArtistNotFound',
  //       message: 'At least one employee with the position of Artist is required to create working hours.',
  //     });
  //   }

  //   // Find existing WorkingBranchEntity for the specified dayOfWeek
  //   let workingBranchEntity;
  //   try {
  //     workingBranchEntity = branch.workingbranch.find(
  //       (wb) => wb.dayOfWeek === weekDayEnum,
  //     );
  //   } catch (error) {
  //     console.error('Error finding working branch:', error);
  //     throw new HttpException({
  //       error: error.Process.error,
  //       message: 'An error occurred while fetching the working branch. Please try again later.',
  //     }, HttpStatus.INTERNAL_SERVER_ERROR);
  //   }

  //   if (workingBranchEntity) {
  //     // Update existing WorkingBranchEntity
  //     workingBranchEntity.workingHours = workingHours;
  //   } else {
  //     // Create new WorkingBranchEntity
  //     try {
  //       workingBranchEntity = this.WorkingBranchsRepository.create({
  //         dayOfWeek: weekDayEnum,
  //         workingHours,
  //         branch,
  //       });
  //       branch.workingbranch.push(workingBranchEntity);
  //     } catch (error) {
  //       console.error('Error creating new working branch entity:', error);
  //       throw new HttpException({
  //         error: 'WorkingBranchCreateError',
  //         message: 'An error occurred while creating the new working branch entity. Please try again.',
  //       }, HttpStatus.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  //   // Save the WorkingBranchEntity
  //   let savedWorkingBranch;
  //   try {
  //     savedWorkingBranch = await this.WorkingBranchsRepository.save(workingBranchEntity);
  //   } catch (error) {
  //     console.error('Error saving working branch:', error);
  //     throw new HttpException({
  //       error: 'WorkingBranchSaveError',
  //       message: 'An error occurred while saving the working branch. Please check your data and try again.',
  //     }, HttpStatus.INTERNAL_SERVER_ERROR);
  //   }

  //   // Call the slot service to manage time slots for the branch
  //   try {
  //     await this.slotService.getNextFourWeeksDatesForDay(
  //       createWorkingBranchDto.dayOfWeek,
  //       branchId,
  //       createWorkingBranchDto.workingHours,
  //     );
  //   } catch (error) {
  //     console.error('Error managing time slots:', error);
  //     throw new HttpException({
  //       error: 'SlotManagementError',
  //       message: 'An error occurred while managing time slots. Please try again later.',
  //     }, HttpStatus.INTERNAL_SERVER_ERROR);
  //   }

  //   // Return only the required fields (id, dayOfWeek, and workingHours)
  //   return {
  //     id: savedWorkingBranch.id,
  //     dayOfWeek: savedWorkingBranch.dayOfWeek,
  //     workingHours: savedWorkingBranch.workingHours,
  //   };
  // }

  async createWorkingBranch(
    branchId: string,
    createWorkingBranchDto: CreateWorkingBranchDto
  ): Promise<{ id: string; dayOfWeek: string; workingHours: string[] }> {
    const { dayOfWeek, workingHours } = createWorkingBranchDto;

    // Convert dayOfWeek from string to WeekDays enum
    const weekDayEnum = WeekDays[dayOfWeek as keyof typeof WeekDays]; 
    if (!weekDayEnum) {
      throw new BadRequestException({
        error: "InvalidDayOfWeek",
        message: `Invalid dayOfWeek: ${dayOfWeek}`,
      });
    }

    // Fetch the branch with the related working branches and employees
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
      relations: ["workingbranch", "employees", "employees.position"],
    });

    if (!branch) {
      throw new NotFoundException({
        error: "BranchNotFound",
        message: `Branch with ID ${branchId} not found`,
      });
    }

    // Check if there is at least one employee with the position of "Artist"
    const artistEmployees = branch.employees.filter(
      (employee) => employee.position?.postion === Postion.ARTIST
    );

    if (artistEmployees.length === 0) {
      throw new BadRequestException({
        error: "ArtistNotFound",
        message:
          "At least one employee with the position of Artist is required to create working hours.",
      });
    }

    // // Validate working hours format
    // const isValidHours = this.validateWorkingHours(workingHours);
    // if (!isValidHours) {
    //   throw new BadRequestException({
    //     error: "InvalidWorkingHours",
    //     message: "Working hours must be in valid format without duplicates.",
    //   });
    // }

    // Calculate total working hours from the input
    const totalWorkingHours = this.calculateTotalWorkingHours(workingHours);

    // Check if at least one artist employee has sufficient working hours
    const hasSufficientHours = artistEmployees.some((employee) => {
      return employee.workingHours >= totalWorkingHours;
    });

    if (!hasSufficientHours) {
      throw new BadRequestException({
        error: "InsufficientArtistHours",
        message: `At least one artist employee must have working hours matching or exceeding the required total of ${totalWorkingHours}.`,
      });
    }

    // Find existing WorkingBranchEntity for the specified dayOfWeek
    let workingBranchEntity = branch.workingbranch.find(
      (wb) => wb.dayOfWeek === weekDayEnum
    );

    if (workingBranchEntity) {
      // Update existing WorkingBranchEntity
      workingBranchEntity.workingHours = workingHours;
    } else {
      // Create new WorkingBranchEntity
      workingBranchEntity = this.WorkingBranchsRepository.create({
        dayOfWeek: weekDayEnum,
        workingHours,
        branch,
      });
      branch.workingbranch.push(workingBranchEntity);
    }
    console.log(workingBranchEntity)
    // Save the WorkingBranchEntity (either updated or newly created)
    const savedWorkingBranch =
      await this.WorkingBranchsRepository.save(workingBranchEntity);
    // Call the slot service to manage time slots for the branch
    await this.slotService.getNextFourWeeksDatesForDay(
      createWorkingBranchDto.dayOfWeek,
      branchId,
      createWorkingBranchDto.workingHours
    );

    // Return only the required fields (id, dayOfWeek, and workingHours)
    return {
      id: savedWorkingBranch.id,
      dayOfWeek: savedWorkingBranch.dayOfWeek,
      workingHours: savedWorkingBranch.workingHours,
    };
  }

  // Method to calculate total working hours based on ranges
  private calculateTotalWorkingHours(workingHours: string[]): number {
    // Initialize total hours
    let totalHours = 0;

    // Convert workingHours into hour ranges
    const timeRanges = [];
    for (let i = 0; i < workingHours.length; i += 2) {
      const start = workingHours[i];
      const end = workingHours[i + 1] || start; // Use start if no end is provided
      const startDate = this.convertToDate(start);
      const endDate = this.convertToDate(end);
      totalHours +=
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    }

    return totalHours;
  }

  // Helper method to convert time string to Date
  private convertToDate(time: string): Date {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  // Method to validate working hours
  private validateWorkingHours(workingHours: string[]): boolean {
    // Check for valid time format and duplicates
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM format
    const seenHours = new Set<string>();

    for (const hour of workingHours) {
      if (!timePattern.test(hour)) {
        return false; // Invalid time format
      }
      if (seenHours.has(hour)) {
        return false; // Duplicate time
      }
      seenHours.add(hour);
    }

    return true; // All checks passed
  }

  async findAll(
    branchId?: string
  ): Promise<Omit<WorkingBranchEntity, "branch">[]> {
    // Validate branchId format if necessary
    if (branchId && typeof branchId !== "string") {
      throw new BadRequestException("Invalid branch ID format");
    }

    // Define the base query options
    const queryOptions: FindOptionsWhere<WorkingBranchEntity> = {};

    // Apply branchId filter if provided
    if (branchId) {
      queryOptions.branch = { id: branchId };
    }

    try {
      // Retrieve working branches with optional filtering and select only necessary fields
      const workingBranches = await this.WorkingBranchsRepository.find({
        where: queryOptions,
        relations: [], // Do not include related branch data
        select: {
          id: true,
          dayOfWeek: true,
          workingHours: true,
        },
      });

      // Optionally handle case where no results are found
      if (workingBranches.length === 0) {
        throw new NotFoundException("No working branches found");
      }

      return workingBranches; // Return the modified result without the branch object
    } catch (error) {
      // Log detailed error information for internal tracking
      // console.error('Error retrieving working branches:', error);

      // Provide more detailed and specific error responses
      if (error instanceof NotFoundException) {
        throw error; // Re-throw known exceptions to preserve specific messages and status codes
      } else if (error instanceof QueryFailedError) {
        // Handle database-specific errors
        throw new BadRequestException(
          "Database query failed. Please check your request and try again."
        );
      } else {
        // Handle other unexpected errors
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error:
              "An unexpected error occurred while retrieving working branches. Please try again later.",
          },
          HttpStatus.BAD_REQUEST
        );
      }
    }
  }

  // Get a specific working branch by ID
  async findOne(id: string): Promise<WorkingBranchEntity> {
    const workingBranch = await this.WorkingBranchsRepository.findOne({
      where: { id },
      relations: ["branch"],
    });
    if (!workingBranch) {
      throw new NotFoundException(`Working branch with ID ${id} not found`);
    }
    return workingBranch;
  }

  // Update a working branch by ID
  async updateWorkingBranches(
    branchId: string,
    updateWorkingBranchesDto: UpdateWorkingBranchDto[]
  ): Promise<BranchEntity> {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
      relations: ["workingbranch"],
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    // Remove existing working branches
    await this.WorkingBranchsRepository.remove(branch.workingbranch);

    // Process each working branch update
    const updatedWorkingBranches = updateWorkingBranchesDto.map((dto) => {
      const newWorkingBranch = this.WorkingBranchsRepository.create({
        ...dto,
        branch: branch,
      });
      return newWorkingBranch;
    });

    // Save new working branches
    branch.workingbranch = await this.WorkingBranchsRepository.save(
      updatedWorkingBranches
    );

    // Save the branch with updated working branches
    return this.branchRepository.save(branch);
  }
}
