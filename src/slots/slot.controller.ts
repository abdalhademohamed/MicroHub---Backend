import { Controller, Get, Post, Body, Query, Param } from "@nestjs/common";
import { SlotService } from "./slots.service";
import { CreateSlotDto } from "./dto/create.slot.dto";
import { GetNearestSlot } from "./dto/nearest.slot.dto";
import { AvailableQueryDto } from "./dto/query.available.dto";
@Controller("slots")
export class SlotController {
  constructor(private readonly slotService: SlotService) {}

  // Create a slot for a branch on a specific date
  @Post()
  async createSlot(@Body() body: CreateSlotDto) {
    return this.slotService.createSlot(body);
  }

  // Get all available slots that have working entities
  @Get("/available/:branchId")
  async getAllAvailableSlots(@Param('branchId') branchId: string, @Query() query: AvailableQueryDto) {
    return this.slotService.getAllAvailableSlots(branchId, query);
  }

  // Get the first available slot for a given branch and duration
  @Get("/nearest")
  async getFirstSlotAvailable(@Query() query: GetNearestSlot) {
    const ids = query.services?.split(',') || []
    return this.slotService.getFirstSlotAvailable(
      query.branch,
      ids,
    );
  }
}
