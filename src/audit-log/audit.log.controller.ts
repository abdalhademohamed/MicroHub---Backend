import {
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuditLogService } from "./audit.log.service";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuditLogEntity } from "./entities/audit.log.entity";
import { GetAuditLogsDto } from "./dto/get.audit.log.dto";
import { Roles } from "../auth/Roles.decorator";
import { Role } from "../user/utils/user.enum";
import { RolesGuard } from "../auth/guards/role.guards";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";

@ApiTags("Audit-Logs")
@Controller("audit/log")
export class AuditLogController {
  constructor(private readonly AuditLogService: AuditLogService) {}


  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER)
  @Get()
  @ApiOperation({ summary: 'Retrieve a list of audit logs' })
  @ApiQuery({
    name: 'username',
    required: false,
    description: 'Filter by username',
    type: String,
  }) 
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Filter by email',
    type: String,
  })
  @ApiQuery({
    name: 'day',
    required: false,
    description: 'Filter by day (YYYY-MM-DD format)',
    type: String,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort by field',
    enum: ['timestamp'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Page size',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'List of audit logs with pagination and filtering',
    type: AuditLogEntity,
    isArray: true,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async getAuditLogs(@Query() query: GetAuditLogsDto) {
    return this.AuditLogService.getAuditLogs(query);
  }
}