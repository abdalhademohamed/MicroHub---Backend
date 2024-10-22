import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  Request,
  Put,
  NotFoundException,
} from "@nestjs/common";
import { BranchService } from "./branch.service";
import { CreateBranchDto } from "./dto/create.branch.dto";
import { UpdateBranchDto } from "./dto/update.branch.dto";
import { BranchEntity } from "./entities/branch.entity";
import { PaginateResultDto } from "./dto/paginate.result.dto";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { RolesGuard } from "../auth/guards/role.guards";
import { Roles } from "../auth/Roles.decorator";
import { Role } from "../user/utils/user.enum";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";
import { FileInterceptor } from "@nestjs/platform-express";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { ReservationEntity } from "../reservation/entities/reservation.entity";
import { FilterBranchesDto } from "./dto/filter.branch.dto";
import { FilterBranchCalendarDto } from "./dto/filter.branch.calendar.dto";

@ApiTags("branch")
@Controller("branch")
export class BranchController {
  constructor(
    private readonly branchService: BranchService,
    private readonly CloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER)
  @Get("count")
  async getBranchCount(): Promise<{ count: number }> {
    const count = await this.branchService.countBranches();
    return { count };
  }
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER)
  @Post()
  @UseInterceptors(FileInterceptor("image")) // 'file' is the name of the field in the form-data
  async createBranch(
    @Body() createBranchDto: CreateBranchDto,
    @UploadedFile() image: Express.Multer.File,
    @Request() req: any, // Request object to access the user
  ): Promise<BranchEntity> {
    if (!image) {
      throw new BadRequestException("Photo is required");
    }
    const folderName = "branches"; // or any other dynamic name based on context
    const imageUrl = await this.branchService.uploadImage(image, folderName);
    createBranchDto.image = imageUrl;
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return this.branchService.createBranch(createBranchDto, userId);
  }
  
  // Endpoint to check if a branch has an artist
  @Get('has/artist/:branchId')
  async checkIfBranchHasArtist(@Param('branchId') branchId: string): Promise<{ hasArtist: boolean }> {
    const hasArtist = await this.branchService.hasArtist(branchId);
    return { hasArtist };
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(
    Role.ADMIN,
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.BRANCHMANAGER,
    Role.RECEPTIONIST,
    Role.ARTISTMANAGER
  )
  @Get("sorted")
  @ApiQuery({
    name: "page",
    type: Number,
    required: false,
    description: "Page number for pagination",
    example: 1,
  })
  @ApiQuery({
    name: "limit",
    type: Number,
    required: false,
    description: "Number of items per page",
    example: 10,
  })
  @ApiQuery({
    name: "order",
    type: String,
    required: false,
    description: "Order of sorting by name",
    example: "ASC",
    enum: ["ASC", "DESC"],
  })
  @ApiOkResponse({
    description: "List of branches with pagination and sorting",
    schema: {
      example: {
        items: [
          {
            id: "1",
            name: "Main Branch",
            location: "123 Main St",
            image: "url_to_image",
          },
        ],
        total: 10,
        currentPage: 1,
        totalPages: 1,
      },
    },
  })
  @Get()
  async getBranches(
    @Request() req: any, // Request object to access the user
    @Query() filterDto: FilterBranchesDto,
  ) {
    const userId = req.user.sub; // Extract user ID from the token
    const userRole = req.user.role; // Extract user role from the token
    console.log(userId, userRole);
    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return this.branchService.getAllBranches(filterDto, userRole, userId);
  }

  // @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN,Role.BRANCHMANAGER)
  @Get(":branchId")
  @ApiParam({
    name: "branchId",
    type: String,
    description: "ID of the branch to fetch",
  })
  async getBranchWithWorkingHours(
    @Param("branchId") branchId: string,
  ): Promise<{
    branch: {
      id: string;
      name: string;
      location: string;
      image: string;
    };
    workingHours: { dayOfWeek: string; hours: string[] }[];
  }> {
    const result = await this.branchService.getBranchWithWorkingHours(branchId);
    if (!result) {
      throw new NotFoundException("Branch not found");
    }
    return result;
  }

  @Get("calendar")
  @ApiQuery({
    name: "branchId",
    type: String,
    description: "Branch ID to filter by",
  })
  @ApiQuery({
    name: "dayOfWeek",
    type: String,
    required: false,
    description: "Day of the week to filter by (e.g., Monday)",
  })
  @ApiQuery({
    name: "date",
    type: String,
    required: false,
    description: "Date for reservations in string format (e.g., 2024-09-05)",
  })
  @ApiQuery({
    name: "page",
    type: Number,
    required: false,
    description: "Page number for pagination",
    example: 1,
  })
  @ApiQuery({
    name: "limit",
    type: Number,
    required: false,
    description: "Number of items per page",
    example: 10,
  })
  @ApiQuery({
    name: "order",
    type: String,
    enum: ["ASC", "DESC"],
    required: false,
    description: "Order of reservations by start time",
    example: "ASC",
  })
  async getBranchCalendar(
    @Query() filterDto: FilterBranchCalendarDto,
  ): Promise<{
    branch: {
      id: string;
      name: string;
      location: string;
      image: string;
    };
    workingHours: { dayOfWeek: string; hours: string[] }[];
    reservations: any[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    if (!filterDto.branchId) {
      throw new BadRequestException("Branch ID is required");
    }

    // Ensure filterDto has default values for page and limit
    // filterDto.page = filterDto.page || 1;
    // filterDto.limit = filterDto.limit || 10;

    // if (filterDto.page < 1) {
    //   throw new BadRequestException('Page must be greater than or equal to 1');
    // }

    // if (filterDto.limit < 1) {
    //   throw new BadRequestException('Limit must be greater than or equal to 1');
    // }

    return this.branchService.getBranchCalendar(filterDto);
  }

  @Put(":id")
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER)
  @UseInterceptors(FileInterceptor("image")) // Use multer for image upload
  async updateBranch(
    @Param("id") id: string,
    @Request() req: any, // Request object to access the user
    @Body() updateBranchDto: UpdateBranchDto,
    @UploadedFile() image?: Express.Multer.File,
    // Handle the uploaded file
  ) {
    // Log received DTO
    console.log("Received UpdateBranchDto:", updateBranchDto);

    // // If an image file is uploaded, include its path in the DTO
    // if (image) {
    //   updateBranchDto.image = image.path;
    // }
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }

    // Call the service method with the updated DTO
    return this.branchService.updateBranch(id, updateBranchDto, userId, image);
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER)
  @Delete(":branchId")
  async deleteBranch(
    @Param("branchId") branchId: string,
    @Request() req: any, // Request object to access the user
  ): Promise<void> {
    const userId = req.user.sub; // Extract user ID from request
    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    await this.branchService.deleteBranch(branchId, userId);
  }
}
