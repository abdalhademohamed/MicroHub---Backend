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
  Req,
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
import { EmployeeWorkingHoursDto } from "./dto/update.employee_workinghors.dto";
import { GetUserProfileDto } from "./dto/get.profile.dto";

@ApiTags("employee")
@Controller("employee")
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get("artist-order")
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.ARTIST)
  getArtistOrder(
    @Req() req: any,
    @Query("fromDate") fromDate: string,
    @Query("toDate") toDate: string,
  ) {
    const userId = req.user.sub; // Extract user ID from request
    return this.employeeService.getOrderStatusCountByArtist(
      userId,
      fromDate,
      toDate,
    );
  }
  @Get("count-order")
  @UseGuards(AccessTokenGuard)
  countOrder(
    @Query("fromDate") fromDate: string,
    @Query("toDate") toDate: string,
    @Query("employeeId") userId: string,
  ) {
    return this.employeeService.getOrderStatusCountForCoordinator(
      userId,
      fromDate,
      toDate,
    );
  }
  @Get("count-order-profile")
  @UseGuards(AccessTokenGuard)
  countOrderForLoogedEmployee(
    @Query("fromDate") fromDate: string,
    @Query("toDate") toDate: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.employeeService.getOrderStatusCountForCoordinator(
      userId,
      fromDate,
      toDate,
    );
  }
  @UseGuards(AccessTokenGuard)
  // @Roles(Role.SUPERADMIN)
  @Put("profile")
  @UseInterceptors(FileInterceptor("image")) // Use interceptor for file uploads
  async updateLoggedEmployee(
    @Request() req: any, // Request object to access the user
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @UploadedFile() image: Express.Multer.File, // If uploading a file
  ) {
    if (image) {
      updateEmployeeDto.image = image.path; // Adjust based on how you handle file paths
    }
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return await this.employeeService.updateEmployee(
      userId,
      updateEmployeeDto,
      image,
    );
  }

  @Get("top/artists")
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ACCOUNTANT,
    Role.ARTIST,
    Role.ARTISTMANAGER,
    Role.ADMIN,
  )
  async getTopArtists(
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ): Promise<EmployeeEntity[]> {
    // Parse the date strings to Date objects if they are provided
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    return this.employeeService.getTopArtistsWithCompletedOrders(from, to);
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

  @Get("search/:keyword")
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ADMIN,
    Role.ARTIST,
    Role.ARTISTMANAGER,
    Role.ADMIN,
  )
  @UseGuards(AccessTokenGuard)
  async getArtistsWithSearch(
    @Param("keyword") keyword: string,
    @Query() query: { page?: string; limit?: string; branch?: string },
    @Req() req: any,
  ) {
    return this.employeeService.searchAndCountEmployees(
      keyword,
      query,
      req.user,
    );
  }
  @Get("artists")
  async getArtistsWithReviews() {
    return this.employeeService.getArtistsWithReviews();
  }
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ACCOUNTANT,
    Role.ADMIN,
  )
  @Get("/count")
  async getEmployeeCount(
    @Query("branchId") branchId?: string,
  ): Promise<{ count: number }> {
    const count = await this.employeeService.countEmployees(branchId);
    return { count };
  }
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.ADMIN)
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
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ARTISTMANAGER,
    Role.ACCOUNTANT,
    Role.ADMIN,
  )
  @Get()
  async getAllEmployees(
    @Request() req: any, // Request object to access the user
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("employeeType") employeeType?: string, // Optional query parameter for filtering
    @Query("branchId") branchId?: string, // Optional query parameter for filtering
    @Query("role") role?: Role, // Optional query parameter for filtering by role
    @Query("filterText") filterText?: string, // Optional query parameter for filtering by English name
  ): Promise<{
    items: EmployeeEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const userId = req.user.sub; // Extract user ID from request

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return await this.employeeService.getAllEmployees(
      page,
      limit,
      employeeType,
      branchId,
      role,
      filterText,
      userId,
    );
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.ARTISTMANAGER, Role.ACCOUNTANT, Role.ADMIN)
  @Get(":id")
  async getEmployeeById(@Param("id") id: string): Promise<EmployeeEntity> {
    return await this.employeeService.getEmployeeById(id);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @Put(":id")
  @UseInterceptors(FileInterceptor("image")) // Use interceptor for file uploads
  async updateEmployee(
    @Request() req: any, // Request object to access the user
    @Param("id") id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @UploadedFile() image: Express.Multer.File, // If uploading a file
  ) {
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
      image,
    );
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.ADMIN)
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
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @Put("active/:employeeId")
  async activeEmployee(@Param("employeeId") employeeId: string) {
    return this.employeeService.activeEmployeeByEmployeeId(employeeId);
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @UseGuards(AccessTokenGuard)
  @Get("show/profile")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user profile with reviews" })
  @ApiResponse({
    status: 200,
    description: "Return user profile data with reviews",
    type: GetUserProfileDto,
  })
  async getProfile(@Request() req: any): Promise<GetUserProfileDto> {
    const userId = req.user.sub;
    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return this.employeeService.getProfile(userId);
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
}
