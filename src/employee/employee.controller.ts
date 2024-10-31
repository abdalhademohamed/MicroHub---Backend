import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  InternalServerErrorException,
  Query,
  NotFoundException,
  Put,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
} from "@nestjs/common";
import { EmployeeService } from "./employee.service";
import { CreateEmployeeDto } from "./dto/create.employee.dto";
import { UpdateEmployeeDto } from "./dto/update.employee.dto";
import { EmployeeEntity } from "./entities/employee.entity";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Roles } from "../auth/Roles.decorator";
import { Role } from "../user/utils/user.enum";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";
import { RolesGuard } from "../auth/guards/role.guards";
import { UserProfileDto } from "./dto/get.profile.dto";
import { EmployeeWorkingHoursDto } from "./dto/update.employee_workinghors.dto";

@ApiTags("employee")
@Controller("employee")
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get('top/artists')
  async getTopArtists(): Promise<EmployeeEntity[]> {
    return this.employeeService.getTopArtistsWithCompletedOrders();
  }
  @Put("working/:id")  
  async updateWorkingHoursEmployee( 
    @Param("id") id: string, 
    @Body() body: EmployeeWorkingHoursDto,
  ) { 
      return await this.employeeService.updateArtistWorkingHours(
        id,
        body.workingHours,
      );
  }

  @Get('artists')
  async getArtistsWithReviews() {
    return this.employeeService.getArtistsWithReviews();
  }
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.COORDINATOR, Role.RECEPTIONIST,Role.ACCOUNTANT)
  @Get("/count")
  async getEmployeeCount(
    @Query("branchId") branchId?: string,
  ): Promise<{ count: number }> {
    const count = await this.employeeService.countEmployees(branchId);
    return { count };
  }
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @UseInterceptors(FileInterceptor("image")) // 'file' is the name of the field in the form-data
  @Post()
  async createEmployee(
    @Request() req: any, // Request object to access the user

    @Body() createEmployeeDto: CreateEmployeeDto,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<EmployeeEntity> {
    if (!image) {
      throw new BadRequestException("Photo is required");
    }
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    const folderName = "employees"; // or any other dynamic name based on context
    const imageUrl = await this.employeeService.uploadImage(image, folderName);
    createEmployeeDto.image = imageUrl;

    return await this.employeeService.createEmployee(createEmployeeDto, userId);
  }

  
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.COORDINATOR, Role.RECEPTIONIST,Role.ARTISTMANAGER,Role.ACCOUNTANT)
  @Get()
  async getAllEmployees(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("employeeType") employeeType?: string, // Optional query parameter for filtering
    @Query("branchId") branchId?: string, // Optional query parameter for filtering
    @Query("role") role?: Role // Optional query parameter for filtering by role
  ): Promise<{
    items: EmployeeEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.employeeService.getAllEmployees(
      page,
      limit,
      employeeType,
      branchId,
      role // Pass the role to the service
    );
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN,Role.ARTISTMANAGER,Role.ACCOUNTANT)
  @Get(":id")
  async getEmployeeById(@Param("id") id: string): Promise<EmployeeEntity> {
    return await this.employeeService.getEmployeeById(id);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Put(":id")
  @UseInterceptors(FileInterceptor("image")) // Use interceptor for file uploads
  async updateEmployee(
    @Request() req: any, // Request object to access the user
    @Param("id") id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @UploadedFile() image: Express.Multer.File, // If uploading a file
  ): Promise<EmployeeEntity | { message: string; error: string; statusCode: number }> {
    if (image) {
      updateEmployeeDto.image = image.path; // Adjust based on how you handle file paths
    }
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return await this.employeeService.updateEmployee(
      id,
      updateEmployeeDto,
      userId,
      image,
    );
  }

  // @UseGuards(AccessTokenGuard, RolesGuard)  // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  @Delete(":employeeId")
  async deleteEmployee(
    @Request() req: any, // Request object to access the user
    @Param("employeeId") employeeId: string,
  ): Promise<void> {
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    await this.employeeService.softDeleteEmployeeByEmployeeId(
      employeeId,
      userId,
    );
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  // @Roles(Role.SUPERADMIN)
  @Get("show/profile")
  @ApiBearerAuth() // To indicate that this route is protected by JWT
  @ApiOperation({ summary: "Get user profile" })
  @ApiResponse({ status: 200, description: "Return user profile data" })
  async getProfile(@Request() req: any): Promise<UserProfileDto> {
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return this.employeeService.getProfile(userId);
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
}
