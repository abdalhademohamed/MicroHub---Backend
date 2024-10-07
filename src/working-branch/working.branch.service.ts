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

 
  async createWorkingBranch(
    branchId: string,
    createWorkingBranchDto: CreateWorkingBranchDto
  ): Promise<WorkingBranchEntity> {
    const { dayOfWeek, workingHours } = createWorkingBranchDto;
  
    // Log the request body
    console.log("Creating working branch with data:", createWorkingBranchDto);
  
    // Convert dayOfWeek from string to WeekDays enum
    const weekDayEnum = WeekDays[dayOfWeek as keyof typeof WeekDays];
    if (!weekDayEnum) {
      throw new BadRequestException(`Invalid dayOfWeek: ${dayOfWeek}`);
    }
  
    let branch: BranchEntity;
    try {
      // Fetch the branch with the related working branches and employees
      branch = await this.branchRepository.findOne({
        where: { id: branchId },
        relations: ["workingbranch", "employees"], // Include related employees
      });
  
      if (!branch) {
        throw new NotFoundException(`Branch with ID ${branchId} not found`);
      }
  
      // Check if there is at least one employee with the position of "Artist"
      const hasArtist = branch.employees.some(
        (employee) => employee.position && employee.position.postion === Postion.ARTIST
      );
  
      if (!hasArtist) {
        throw new BadRequestException("At least one employee with the position of 'Artist' is required to create working hours.");
      }
    } catch (error) {
      console.error('Error fetching branch:', error);
      throw new InternalServerErrorException('Could not fetch branch. Please try again later.');
    }
  
    let workingBranchEntity: WorkingBranchEntity | undefined;
  
    // Check if the working branch for the specified day exists
    workingBranchEntity = branch.workingbranch.find(
      (wb) => wb.dayOfWeek === weekDayEnum
    );
  
    try {
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
  
      // Save the WorkingBranchEntity and include the branch details
      const savedWorkingBranch = await this.WorkingBranchsRepository.save(workingBranchEntity);
  
      await this.slotService.getNextFourWeeksDatesForDay(
        createWorkingBranchDto.dayOfWeek,
        branchId,
        createWorkingBranchDto.workingHours
      );
  
      // Log the successful creation
      console.log('Successfully created working branch:', savedWorkingBranch);
  
      // Return the saved WorkingBranchEntity
      return savedWorkingBranch;
  
    } catch (error) {
      console.error('Error saving working branch:', error);
      // Handle unexpected errors
      throw new InternalServerErrorException('Could not create working branch. Please try again later.');
    }
  }
  
  
  

    async findAll(branchId?: string): Promise<WorkingBranchEntity[]> {
      // Validate branchId format if necessary
      if (branchId && typeof branchId !== 'string') {
        throw new BadRequestException('Invalid branch ID format');
      }
  
      // Log the received branchId
      console.log('Received branchId for findAll:', branchId);
  
      // Define the base query options
      const queryOptions: FindOptionsWhere<WorkingBranchEntity> = {};
  
      // Apply branchId filter if provided
      if (branchId) {
        queryOptions.branch = { id: branchId };
      }
  
      try {
        // Retrieve working branches with optional filtering and relations
        const workingBranches = await this.WorkingBranchsRepository.find({
          where: queryOptions,
          relations: ['branch'], // Include related branch data
        });
  
        // Handle case where no results are found
        if (workingBranches.length === 0) {
          console.warn('No working branches found for branchId:', branchId);
          throw new NotFoundException('No working branches found');
        }
  
        // Log the retrieved working branches
        console.log('Retrieved working branches:', workingBranches);
  
        // Log the response before returning
        console.log('Response to be returned:', workingBranches);
  
        return workingBranches;
      } catch (error) {
        // Log detailed error information for internal tracking
        console.error('Error retrieving working branches:', error);
  
        // Categorize errors
        if (error instanceof NotFoundException) {
          throw error; // Preserve specific messages and status codes for known exceptions
        } else if (error instanceof QueryFailedError) {
          // Handle database-specific errors
          throw new BadRequestException(
            'Database query failed. Please check your request and try again.',
          );
        } else {
          // Handle unexpected errors
          throw new InternalServerErrorException('An unexpected error occurred while retrieving working branches. Please try again later.');
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
