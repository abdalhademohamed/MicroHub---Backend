// branch service
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import Branch from './entities/branch.entity';

@Injectable()
export class BranchService {
    constructor(
        @InjectRepository(Branch)
        private readonly branchRepository: Repository<Branch>,
    ) {}

    async findOneById(id: number): Promise<Branch | undefined> {
        return this.branchRepository.findOne({ where: { id } });
    }

    async create(branch: Branch): Promise<Branch> {
        return this.branchRepository.save(branch);
    }

    async findAll(): Promise<Branch[]> {
        return this.branchRepository.find();
    }

    async update(id: number, branch: Branch): Promise<Branch> {
        await this.branchRepository.update(id, branch);
        return this.branchRepository.findOne({ where: { id } });
    }

    async delete(id: number): Promise<void> {
        await this.branchRepository.delete(id);
    }
    
}