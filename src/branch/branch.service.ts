import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateBranchDto } from './dto/create.branch.dto';
import { UpdateBranchDto } from './dto/update.branch.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchEntity } from './entities/branch.entity';
import { PaginateResultDto } from './dto/paginate.result.dto';
import { create } from 'domain';

@Injectable()
export class BranchService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly BranchRepository: Repository<BranchEntity>,
  ) {}

  async createBranch(createBranchDto: CreateBranchDto): Promise<BranchEntity> {
    const { name, location, imageUrl } = createBranchDto;
  
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
      const branch = this.BranchRepository.create({ name, location, imageUrl });
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
}
