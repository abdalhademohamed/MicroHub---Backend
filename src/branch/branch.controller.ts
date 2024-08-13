import { Controller, Post, Body, HttpException, HttpStatus, Put } from '@nestjs/common';
import { BranchService } from './branch.service';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/createBranch.dto';
import { UpdateBranchDto } from './dto/updateBranch.dto';

@Controller('branch')
export class BranchController {
    constructor(private readonly branchService: BranchService) {}
   
     @Get('findAll')
    async findAll(): Promise<Branch[]> {
        return this.branchService.findAll();
    }



    @Post('create')
    async create(@Body() createBranchDto: CreateBranchDto): Promise<Branch> {
        const branch = new Branch();
        branch.name = createBranchDto.name;
        branch.location = createBranchDto.location;
        branch.imageUrl = createBranchDto.imageUrl;
        return this.branchService.create(branch);
    }

    @Put('update')
    async update(@Body() updateBranchDto: UpdateBranchDto): Promise<Branch> {
        const branch = new Branch();
        branch.id = updateBranchDto.id;
        branch.name = updateBranchDto.name;
        branch.location = updateBranchDto.location;
        branch.imageUrl = updateBranchDto.imageUrl;
        return this.branchService.update(branch.id, branch);
    }

    @Get('findOneById')
    async findOneById(@Param('id') id: number): Promise<Branch | undefined> {
        return this.branchService.findOneById(id);
    }
  

}