import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { WorkingBranchService } from './working.branch.service';
import { CreateWorkingBranchDto } from './dto/create.working.branch.dto';
import { UpdateWorkingBranchDto } from './dto/update.working.branch.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WorkingBranchEntity } from './entities/working.branch.entity';

ApiTags('working/branch')
@Controller('working/branch')
export class WorkingBranchController {
  constructor(private readonly workingBranchService: WorkingBranchService) {}

 
  @Post(':branchId')
  @HttpCode(HttpStatus.OK)
  async createWorkingBranch(
      @Param('branchId') branchId: string,
      @Body() createWorkingBranchDto: CreateWorkingBranchDto,
  ): Promise<WorkingBranchEntity> {
      return this.workingBranchService.createWorkingBranch(branchId, createWorkingBranchDto);
  }


  @Get()
  @ApiOperation({ summary: 'Get all working branches' })
  @ApiResponse({ status: 200, description: 'List of working branches', type: [WorkingBranchEntity] })
  async findAll(): Promise<WorkingBranchEntity[]> {
    return this.workingBranchService.findAll();
  }

  // @Get(':id')
  // @ApiOperation({ summary: 'Get a specific working branch by ID' })
  // @ApiResponse({ status: 200, description: 'The working branch', type: WorkingBranchEntity })
  // @ApiResponse({ status: 404, description: 'Working branch not found' })
  // async findOne(@Param('id') id: string): Promise<WorkingBranchEntity> {
  //   return this.workingBranchService.findOne(id);
  // }

  @Put(':id')
  @ApiOperation({ summary: 'Update a working branch by ID' })
  @ApiResponse({ status: 200, description: 'The updated working branch', type: WorkingBranchEntity })
  @ApiResponse({ status: 404, description: 'Working branch not found' })
  async update(@Param('id') id: string, @Body() updateWorkingBranchDto: UpdateWorkingBranchDto): Promise<WorkingBranchEntity> {
    return this.workingBranchService.update(id, updateWorkingBranchDto);
  }
}