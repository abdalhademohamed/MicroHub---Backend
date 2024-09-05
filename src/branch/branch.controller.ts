import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, BadRequestException } from '@nestjs/common';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create.branch.dto';
import { UpdateBranchDto } from './dto/update.branch.dto';
import { BranchEntity } from './entities/branch.entity';
import { PaginateResultDto } from './dto/paginate.result.dto';
import { ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/role.guards';
import { Roles } from '../auth/Roles.decorator';
import { Role } from '../user/utils/user.enum';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ReservationEntity } from 'src/reservation/entities/reservation.entity';


@ApiTags('branch')
@Controller('branch')
export class BranchController {
  constructor(private readonly branchService: BranchService,
    private readonly CloudinaryService: CloudinaryService
  ) {}




  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN,Role.BRANCHMANAGER)
  @Post()
  @UseInterceptors(FileInterceptor('image'))  // 'file' is the name of the field in the form-data
  async createBranch(
    @Body() createBranchDto: CreateBranchDto,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<BranchEntity> {
    if (!image) {
      throw new BadRequestException('Photo is required');
    }
    const folderName = 'branches'; // or any other dynamic name based on context
    const imageUrl = await this.branchService.uploadImage(image,folderName);
    createBranchDto.image = imageUrl;

    return this.branchService.createBranch(createBranchDto);
  }
  
  
  
  
  
  
  
  
  
  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN,Role.BRANCHMANAGER)
  @Get()
  async getBranches(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<PaginateResultDto<BranchEntity>> {
    return await this.branchService.getBranches(page, limit);
  }
  
  @Get('calender')
  async getWorkingHoursAndReservations(
    @Param('branchId') branchId: string,
    @Query('dayOfWeek') dayOfWeek: string,
    @Query('date') date: string,
  ): Promise<{ workingHours: string[], reservations: ReservationEntity[] }> {
    return this.branchService.getBranchCalendar(branchId, dayOfWeek, date);
  }


  @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN,Role.BRANCHMANAGER)
  @Delete(':branchId')
  async deleteBranch(@Param('branchId') branchId: string): Promise<void> {
    await this.branchService.deleteBranch(branchId);
  }
}
