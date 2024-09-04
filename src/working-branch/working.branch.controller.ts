import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkingBranchService } from './working.branch.service';
import { CreateWorkingBranchDto } from './dto/create.working.branch.dto';
import { UpdateWorkingBranchDto } from './dto/update.working.branch.dto';
import { ApiTags } from '@nestjs/swagger';
import { WorkingBranchEntity } from './entities/working.branch.entity';

ApiTags('working/branch')
@Controller('working')
export class WorkingBranchController {
  constructor(private readonly workingBranchService: WorkingBranchService) {}

 
  @Post('branch/:branchId')
  @HttpCode(HttpStatus.OK)
  async createWorkingBranch(
      @Param('branchId') branchId: string,
      @Body() createWorkingBranchDto: CreateWorkingBranchDto,
  ): Promise<WorkingBranchEntity> {
      return this.workingBranchService.createWorkingBranch(branchId, createWorkingBranchDto);
  }
}