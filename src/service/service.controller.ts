import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Request,
} from "@nestjs/common";
import { ServiceService } from "./service.service";
import { CreateServiceDto } from "./dto/create.service.dto";
import { UpdateServiceDto } from "./dto/update.service.dto";
import { ServiceEntity } from "./entities/service.entity";
import { PaginateResultDto } from "../branch/dto/paginate.result.dto";
import { ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";
import { RolesGuard } from "../auth/guards/role.guards";
import { Role } from "../user/utils/user.enum";
import { Roles } from "../auth/Roles.decorator";
@ApiTags("service")
@Controller("service")
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.ACCOUNTANT)
  @Get("/count")
  async getServiceCount(): Promise<{ count: number }> {
    const count = await this.serviceService.countServices();
    return { count };
  }
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("image")) // Use the FileInterceptor to handle file uploads
  async createService(
    @Request() req: any,
    @Body() createServiceDto: CreateServiceDto,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<ServiceEntity> {
    const userId = req.user.sub; // Hardcoded user ID for now

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return await this.serviceService.createService(
      createServiceDto,
      image,
      userId,
    );
  }
  @Get("with-reservation-count")
  async getServicesWithReservationCount(@Query('page') page: number = 1,@Query('limit') limit: number = 10) {
    return this.serviceService.getServicesWithReservationCount(page, limit);
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ARTISTMANAGER,
    Role.ACCOUNTANT,
  )
  @Get("sort")
  async getAllServices(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("sortBy") sortBy: string = "english_Name", // Default sorting by 'englishName'
    @Query("order") order: "ASC" | "DESC" = "ASC", // Default order 'ASC'
  ): Promise<PaginateResultDto<ServiceEntity>> {
    return this.serviceService.getAllServices(page, limit, sortBy, order);
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Put(":id")
  @UseInterceptors(FileInterceptor("image")) // Use interceptor for file uploads
  async updateService(
    @Request() req: any,

    @Param("id") id: string,
    @Body() updateServiceDto: CreateServiceDto,
    @UploadedFile() image: Express.Multer.File, // If uploading a file
  ): Promise<ServiceEntity> {
    const userId = req.user.sub; // Hardcoded user ID for now

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return this.serviceService.updateService(
      id,
      updateServiceDto,
      userId,
      image,
    );
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteService(@Param("id") id: string): Promise<void> {
    return this.serviceService.deleteService(id);
  }
}
