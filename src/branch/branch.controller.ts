import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create.branch.dto';
import { UpdateBranchDto } from './dto/update.branch.dto';
import { BranchEntity } from './entities/branch.entity';
import { PaginateResultDto } from './dto/paginate.result.dto';
import { ApiTags } from '@nestjs/swagger';


@ApiTags('branch')
@Controller('branch')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  async createBranch(@Body() createBranchDto: CreateBranchDto): Promise<BranchEntity> {
    return await this.branchService.createBranch(createBranchDto);
  }
  @Get()
  async getBranches(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<PaginateResultDto<BranchEntity>> {
    return await this.branchService.getBranches(page, limit);
  }
  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.branchService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
  //   return this.branchService.update(+id, updateBranchDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.branchService.remove(+id);
  // }
}
