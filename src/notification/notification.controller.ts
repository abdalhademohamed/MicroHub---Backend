import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Request, HttpException, HttpStatus } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SendNotificationDto } from './dto/send.notification.dto';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard';
import { FcmTokenService } from './fcm.token.service';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
@ApiTags('notification')
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService,
    private readonly FcmTokenService: FcmTokenService
  ) {}

  @Post('send/single')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Send a notification to a user' })
  @ApiBody({ type: SendNotificationDto })
  @ApiResponse({
    status: 200,
    description: 'Notification sent successfully',
    schema: {
      example: {
        success: true,
        message: 'Notification sent successfully',
        response: {
          success: true,
          message: 'Notification sent successfully',
          response: {
            // Example response structure
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: {
      example: {
        success: false,
        message: 'No FCM token found for this user.',
      }
    }
  })
  async sendNotification(
    @Body() sendNotificationDto: SendNotificationDto,
    @Request() req: any,
  ) {
    const { title, message } = sendNotificationDto;
    const userId = req.user.sub; // Extract user ID from the request object

    try {
      return await this.notificationService.createNotification(userId, title, message);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }


  @Post('save')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Save FCM token for a user' })
  @ApiBody({
    description: 'FCM token to be saved',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string'}
      },
      required: ['token']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'FCM token saved successfully',
    schema: {
      example: {
        success: true,
        message: 'FCM token saved successfully',
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: {
      example: {
        success: false,
        message: 'User ID and token are required',
      }
    }
  })
  async saveToken(
    @Body() body: { token: string },
    @Request() req: any,
  ) {
    const userId = req.user.sub; // Extract user ID from the request object
    const { token } = body;

    if (!userId || !token) {
      throw new HttpException('User ID and token are required', HttpStatus.BAD_REQUEST);
    }

    return await this.FcmTokenService.saveToken(userId, token);
  }

  @Post('send/multiple')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Send a notification to multiple users' })
  @ApiBody({
    description: 'Payload to send notifications to multiple device tokens',
    schema: {
      type: 'object',
      properties: {
        tokens: {
          type: 'array',
          items: { type: 'string' },
          example: ['token1', 'token2', 'token3']
        },
        title: { type: 'string', example: 'Notification Title' },
        message: { type: 'string', example: 'Notification Message' }
      },
      required: ['tokens', 'title', 'message']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications sent successfully to all devices',
    schema: {
      example: {
        success: true,
        message: 'Notification sent successfully to all devices',
        response: {
          // Example response structure for multiple device notification
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: {
      example: {
        success: false,
        message: 'Failed to send notification to some tokens',
        errors: [
          { token: 'token1', error: 'Error message' }
        ]
      }
    }
  })
  async sendNotificationToMultipleUsers(
    @Body() body: { userIds: string[], title: string, message: string },
    @Request() req: any,
  ) {
    const { userIds, title, message } = body;

    if (!userIds || userIds.length === 0 || !title || !message) {
      throw new HttpException('User IDs, title, and message are required', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.notificationService.sendNotificationToMultipleUsers(userIds, title, message);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch('markseen/:notificationId')
  @ApiOperation({ summary: 'Mark a notification as seen' })
  @ApiParam({
    name: 'notificationId',
    description: 'ID of the notification to mark as seen',
    type: String,
    example: 'd33df3e2-e483-46e0-85ab-fb8d8824a4ba'
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as seen successfully',
    schema: {
      example: {
        success: true,
        message: 'Notification marked as seen',
        response: {
          id: 'd33df3e2-e483-46e0-85ab-fb8d8824a4ba',
          title: 'Test Notification',
          message: 'This is a test notification message',
          createdAt: '2024-09-08T08:57:27.752Z',
          updatedAt: '2024-09-08T09:00:00.000Z',
          seenAt: '2024-09-08T09:00:00.000Z',
          userId: 'f7b15640-e479-4302-9710-76cb2f08d96d',
          fcmTokenId: 'a94d55c4-c2b7-4cb1-a2db-56c8d88f0d8a'
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: {
      example: {
        success: false,
        message: 'Notification not found',
        response: null
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    schema: {
      example: {
        success: false,
        message: 'Failed to mark notification as seen: <error-message>',
        response: null
      }
    }
  })
  async markAsSeen(@Param('notificationId') notificationId: string): Promise<any> {
    try {
      const result = await this.notificationService.markAsSeen(notificationId);
      if (!result.success) {
        throw new HttpException(result.message, HttpStatus.BAD_REQUEST);
      }
      return result;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}