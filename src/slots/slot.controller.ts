import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from "@nestjs/common";
import { SlotService } from "./slots.service";
import { CreateSlotDto } from "./dto/create.slot.dto";
import { GetNearestSlot } from "./dto/nearest.slot.dto";
import { AvailableQueryDto } from "./dto/query.available.dto";
import { Roles } from "../auth/Roles.decorator";
import { RolesGuard } from "../auth/guards/role.guards";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";
import { Role } from "../user/utils/user.enum";
@Controller("slots")
export class SlotController {
  constructor(private readonly slotService: SlotService) {}

  // Get all available slots that have working entities
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ARTISTMANAGER,
    Role.ADMIN,
  )
  @Get("/available/:branchId")
  async getAllAvailableSlots(
    @Param("branchId") branchId: string,
    @Query() query: AvailableQueryDto,
    @Body('timezone') timezone: string,
  ) {
    if(!timezone){
      timezone = 'Asia/Riyadh'
    }
    return this.slotService.getAllAvailableSlots(branchId, query, timezone);
  }

  // Get the first available slot for a given branch and duration
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ARTISTMANAGER,
    Role.ADMIN,
  )
  @Get("/nearest")
  async getFirstSlotAvailable(@Query() query: GetNearestSlot) {
    const ids = query.services?.split(",") || [];
    const rootoshIds = query.rootosh?.split(",") || [];

    return this.slotService.getFirstSlotAvailable(
      query.branch,
      ids,
      rootoshIds,
    );
  }
}
