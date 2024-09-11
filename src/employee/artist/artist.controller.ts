import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { EmployeeService } from '../employee.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ArtistService } from './artist.service';
import { AccessTokenGuard } from '../../auth/guards/accessToken.guard';
import { RolesGuard } from '../../auth/guards/role.guards';
import { Role } from '../../user/utils/user.enum';
import { Roles } from '../../auth/Roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';


@ApiTags('artist')
@Controller('artist')
export class ArtistController {
  constructor(private readonly ArtistService: ArtistService) {}


  
  @Post('comment')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Add a comment to an order' })
  @ApiResponse({ status: 201, description: 'Comment added successfully.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @UseInterceptors(FileInterceptor('image')) // Use multer for image upload
  async addComment(
    @Request() req: any, // Request object to access the user

    @Query('orderId') orderId: string,
    @Query('content') content: string,
    @UploadedFile() image: Express.Multer.File, // File uploads cannot be passed as query parameters
  ) {
    if (!orderId || !content) {
      throw new BadRequestException('OrderId and content are required');
    }
    const userId = req.user.sub; // Extract user ID from request
   
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    return this.ArtistService.addComment(orderId, content, image,userId);
  }


 
}
