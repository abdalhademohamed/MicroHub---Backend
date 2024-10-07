import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from "@nestjs/common";
import { CreateRootoshDto } from "./dto/create-rootosh.dto";
import { RootoshEntity } from "./entities/rootosh.entity";
import { RootoshService } from "./rootosh.service";
import { UpdateRootoshDto } from "./dto/update-rootosh.dto";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/Roles.decorator";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";
import { Role } from "../user/utils/user.enum";
import { RolesGuard } from "../auth/guards/role.guards";

@ApiTags("rootosh")
@Controller("rootosh")
export class RootoshController {
  constructor(private readonly RootoshService: RootoshService) {}

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Post()
  async create(
    @Request() req: any,
    @Body() createRootoshDto: CreateRootoshDto
  ): Promise<any> {
    const userId = req.user.sub; // Hardcoded user ID for now

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return this.RootoshService.createRootosh(createRootoshDto, userId);
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Get()
  async findAllRootosh(
    @Query("page") page: number = 1, // Default page is 1
    @Query("limit") limit: number = 10 // Default limit is 10
  ): Promise<{
    items: RootoshEntity[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    return this.RootoshService.findAllRootosh(page, limit);
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Get(":id")
  async findOne(@Param("id") id: string): Promise<RootoshEntity> {
    return this.RootoshService.findOneRootosh(id);
  }


  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Get("service/:serviceId")
  async getRootoshesByServiceId(
    @Param("serviceId") serviceId: string
  ): Promise<RootoshEntity[]> {
    return this.RootoshService.getRootoshesByServiceId(serviceId);
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Put(":id")
  async update(
    @Request() req: any,
    @Param("id") id: string,
    @Body() updateRootoshDto: UpdateRootoshDto
  ): Promise<RootoshEntity> {
    const userId = req.user.sub; // Hardcoded user ID for now

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return this.RootoshService.updateRootosh(id, updateRootoshDto, userId);
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN)
  @Delete(":id")
  async remove(@Param("id") id: string): Promise<void> {
    return this.RootoshService.removeRootosh(id);
  }
}