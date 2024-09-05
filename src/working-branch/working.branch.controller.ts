import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Put, Query } from '@nestjs/common';
import { WorkingBranchService } from './working.branch.service';
import { CreateWorkingBranchDto } from './dto/create.working.branch.dto';
import { UpdateWorkingBranchDto } from './dto/update.working.branch.dto';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Retrieve working branches with optional branch ID filtering' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of working branches with optional branch ID filtering.',
    type: [WorkingBranchEntity],
  })
  @ApiQuery({
    name: 'branchId',
    required: false,
    description: 'ID of the branch to filter working branches by',
    type: String,
  })
  async findAll(
    @Query('branchId') branchId?: string
  ): Promise<WorkingBranchEntity[]> {
    return this.workingBranchService.findAll(branchId);
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