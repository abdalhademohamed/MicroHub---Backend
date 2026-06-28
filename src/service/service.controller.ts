import {
  Controller,
  Get,
  Post,
  Body,
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
  Res,
  Patch,
  InternalServerErrorException,
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
import { Response } from "express";
import { FindServiceDto } from "./dto/find.service.dto";

@ApiTags("service")
@Controller("service")
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @UseGuards(AccessTokenGuard, RolesGuard) 
  @Roles(Role.SUPERADMIN, Role.ACCOUNTANT, Role.ADMIN)
  @Get("/count")
  async getServiceCount(): Promise<{ count: number }> {
    const count = await this.serviceService.countServices();
    return { count };
  }
  @UseGuards(AccessTokenGuard, RolesGuard) 
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("image")) 
  async createService(
    @Request() req: any,
    @Body() createServiceDto: CreateServiceDto,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<ServiceEntity> {
    const userId = req.user.sub; 

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
  async getServicesWithReservationCount(@Query() query: FindServiceDto) {
    return this.serviceService.getServicesWithReservationCount(query);
  }
  @Get("with-reservation-count-file")
  async getServicesWithReservationCountExcel(
    @Query() query: FindServiceDto,
    @Res() res: Response,
    @Query("file") file: string,
  ) {
    return this.serviceService.serviceCountExcel(query, res, file);
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  @UseGuards(AccessTokenGuard, RolesGuard) 
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ARTISTMANAGER,
    Role.ACCOUNTANT,
    Role.ADMIN,
  )
  @Get("sort")
  async getAllServices(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("sortBy") sortBy: string = "english_Name", 
    @Query("order") order: "ASC" | "DESC" = "ASC", 
  ): Promise<PaginateResultDto<ServiceEntity>> {
    return this.serviceService.getAllServices(page, limit, sortBy, order);
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  @UseGuards(AccessTokenGuard, RolesGuard) 
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @Put(":id")
  @UseInterceptors(FileInterceptor("image")) 
  async updateService(
    @Request() req: any,

    @Param("id") id: string,
    @Body() updateServiceDto: UpdateServiceDto, 
    @UploadedFile() image: Express.Multer.File, 
  ): Promise<ServiceEntity> {
    const userId = req.user.sub; 

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return await this.serviceService.updateService(
      id,
      updateServiceDto as any, 
      userId,
      image,
    );
  }

  @Patch(":id/toggle")
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async toggleServiceStatus(
    @Param("id") id: string,
    @Body('isActive') isActive: boolean,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    const updateDto = { isActive } as any;
    return await this.serviceService.updateService(id, updateDto, userId);
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteService(@Param("id") id: string): Promise<void> {
    return this.serviceService.deleteService(id);
  }

  /* -------------------------------------------------------------------------- */
  /* Trash Endpoints                                                             */
  /* -------------------------------------------------------------------------- */
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @Get("trash")
  async getDeletedServices() {
    return this.serviceService.getDeletedServices();
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @Patch(":id/restore")
  async restoreService(@Param("id") id: string) {
    return this.serviceService.restoreService(id);
  }

  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @Delete(":id/force")
  async hardDeleteService(@Param("id") id: string) {
    return this.serviceService.hardDeleteService(id);
  }
}