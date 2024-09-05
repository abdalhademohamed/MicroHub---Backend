import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateWorkingBranchDto } from './dto/create.working.branch.dto';
import { UpdateWorkingBranchDto } from './dto/update.working.branch.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { BranchEntity } from '../branch/entities/branch.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import { WorkingBranchEntity } from './entities/working.branch.entity';
import { WeekDays } from '../branch/utils/days.enum';

@Injectable()
export class WorkingBranchService {
    constructor(
        @InjectRepository(BranchEntity)
        private readonly branchRepository: Repository<BranchEntity>,
    
        @InjectRepository(WorkingBranchEntity)
        private readonly WorkingBranchsRepository: Repository<WorkingBranchEntity>,
      ) {}
    
      async createWorkingBranch(branchId: string, createWorkingBranchDto: CreateWorkingBranchDto): Promise<WorkingBranchEntity> {
        const { dayOfWeek, workingHours } = createWorkingBranchDto;
    
        // Convert dayOfWeek from string to WeekDays enum
        const weekDayEnum = WeekDays[dayOfWeek as keyof typeof WeekDays];
        if (!weekDayEnum) {
            throw new Error(`Invalid dayOfWeek: ${dayOfWeek}`);
        }
    
        // Fetch the branch with the related working branches
        const branch = await this.branchRepository.findOne({
            where: { id: branchId },
            relations: ['workingbranch'],
        });
    
        if (!branch) {
            throw new NotFoundException(`Branch with ID ${branchId} not found`);
        }
    
        // Find existing WorkingBranchEntity for the specified dayOfWeek
        let workingBranchEntity = branch.workingbranch.find(
            (wb) => wb.dayOfWeek === weekDayEnum,
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
    
        // Save the WorkingBranchEntity and include the branch details
        const savedWorkingBranch = await this.WorkingBranchsRepository.save(workingBranchEntity);
    
        // Return the saved WorkingBranchEntity, which includes the branch details
        return savedWorkingBranch;
    }


 // Get all working branches
 async findAll(branchId?: string): Promise<WorkingBranchEntity[]> {
  // Validate branchId format if necessary
  if (branchId && typeof branchId !== 'string') {
    throw new BadRequestException('Invalid branch ID format');
  }

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

    // Optionally handle case where no results are found
    if (workingBranches.length === 0) {
      throw new NotFoundException('No working branches found');
    }

    return workingBranches;
  } catch (error) {
    // Handle database access errors or other unexpected errors
    throw new Error('An error occurred while retrieving working branches: ' + error.message);
  }
}

  // Get a specific working branch by ID
  async findOne(id: string): Promise<WorkingBranchEntity> {
    const workingBranch = await this.WorkingBranchsRepository.findOne({ where: { id }, relations: ['branch'] });
    if (!workingBranch) {
      throw new NotFoundException(`Working branch with ID ${id} not found`);
    }
    return workingBranch;
  }

  // Update a working branch by ID
  async update(id: string, updateWorkingBranchDto: UpdateWorkingBranchDto): Promise<WorkingBranchEntity> {
    const workingBranch = await this.findOne(id);
    if (!workingBranch) {
      throw new NotFoundException(`Working branch with ID ${id} not found`);
    }
    
    Object.assign(workingBranch, updateWorkingBranchDto);
    return this.WorkingBranchsRepository.save(workingBranch);
  }

  }