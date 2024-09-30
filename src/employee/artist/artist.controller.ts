import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { EmployeeService } from "../employee.service";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ArtistService } from "./artist.service";
import { AccessTokenGuard } from "../../auth/guards/accessToken.guard";
import { RolesGuard } from "../../auth/guards/role.guards";
import { Role } from "../../user/utils/user.enum";
import { Roles } from "../../auth/Roles.decorator";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";

@ApiTags("artist")
@Controller("artist")
export class ArtistController {
  constructor(private readonly ArtistService: ArtistService) {}

  
  @Post("comment/:orderId")
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ARTIST)
  @ApiOperation({ summary: "Add a comment to an order" })
  @ApiResponse({ status: 201, description: "Comment added successfully." })
  @ApiResponse({ status: 404, description: "Order not found." })
  @UseInterceptors(FilesInterceptor('image', 2)) // Use FilesInterceptor for multiple files
  async addComment(
    @Request() req: any,
    @Param("orderId") orderId: string,
    @Body("content") content: string,
    @UploadedFiles() files: Array<Express.Multer.File>, // Get all uploaded files
  ) {
    if (!orderId || !content) {
      throw new BadRequestException("OrderId and content are required");
    }

    const userId = req.user.sub; // Hardcoded user ID for now

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }

    const imageBefore = files[0]; // First image
    const imageAfter = files[1];  // Second image

    if (!imageBefore || !imageAfter) {
      throw new BadRequestException("Both imageBefore and imageAfter are required");
    }

    return this.ArtistService.addComment(
      orderId,
      content,
      imageBefore,
      imageAfter,
      userId,
    );
  }
}

