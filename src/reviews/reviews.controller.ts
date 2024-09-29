import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
  NotFoundException,
  InternalServerErrorException,
  Request,
  BadRequestException,
} from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./dto/create.review.dto";
import { UpdateReviewDto } from "./dto/update.review.dto";
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ReviewEntity } from "./entities/review.entity";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";
import { RolesGuard } from "../auth/guards/role.guards";
import { Role } from "../user/utils/user.enum";
import { Roles } from "../auth/Roles.decorator";
import { GetReviewsDto } from "./dto/get.reviews.dto";

@ApiTags("reviews")
@Controller("review")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER,Role.ARTISTMANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Review successfully created",
    type: ReviewEntity,
  })
  @ApiBadRequestResponse({ description: "Invalid input" })
  @ApiInternalServerErrorResponse({ description: "Failed to create review" })
  async createReview(    @Request() req: any, // Request object to access the user
  @Body() createReviewDto: CreateReviewDto) {
    const userId = req.user.sub; // Hardcoded user ID for now

    if (!userId) {
      throw new BadRequestException("User not authenticated");
    }
    return this.reviewsService.createReview(createReviewDto,userId);
  }

  @Get("sorted")
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER,Role.ARTISTMANAGER)
  @ApiResponse({
    status: 200,
    description: "Get all reviews",
    type: [ReviewEntity],
  })
  async getAllReviews(@Query() query: GetReviewsDto) {
    return this.reviewsService.getAllReviews(query);
  }

  @Get("artist/:employeeId")
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER,Role.ARTISTMANAGER,Role.ARTIST)
  @ApiParam({
    name: "employeeId",
    type: String,
    description: "ID of the artist (employee)",
  })
  @ApiResponse({
    status: 200,
    description: "Returns reviews for the specified artist.",
    type: [ReviewEntity],
  })
  @ApiResponse({
    status: 404,
    description: "Artist not found or not an artist",
  })
  @ApiResponse({ status: 500, description: "Failed to retrieve reviews" })
  async getReviewsForArtist(
    @Param("employeeId") employeeId: string,
  ): Promise<ReviewEntity[]> {
    try {
      return await this.reviewsService.getReviewsForArtist(employeeId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Failed to get reviews for artist",
        error.stack,
      ); 
    }
  }

  @Get('order/:orderId')
  async getReviewsByOrderId(@Param('orderId') orderId: string): Promise<ReviewEntity[]> {
    return this.reviewsService.getReviewsByOrderId(orderId);
  }
}
