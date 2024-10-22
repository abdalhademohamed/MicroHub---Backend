import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import { InjectRepository } from "@nestjs/typeorm";
import { NotificationEntity } from "./entities/notification.entity";
import { Repository } from "typeorm";
import { FcmService } from "./fcm.service";
import { FcmTokenService } from "./fcm.token.service";

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    private readonly fcmService: FcmService,
    private readonly fcmTokenService: FcmTokenService,
  ) {}

  async createNotification(
    userId: string,
    title: string,
    message: string,
  ): Promise<any> {
    const fcmToken = await this.fcmTokenService.getTokenByUserId(userId);

    if (!fcmToken || !fcmToken.token) {
      console.error("No FCM token found for this user.");
      return {
        success: false,
        message: "No FCM token found for this user.",
        response: null,
      };
    }
    const isExpired = await this.fcmTokenService.isTokenExpired(fcmToken.id);
    if (isExpired) {
      return {
        success: false,
        message: "FCM token has expired",
        response: null,
      };
    }
    // Create and save notification
    const notification = this.notificationRepository.create({
      user: { id: userId },
      title,
      message,
      fcmToken,
    });
 
    const savedNotification =
      await this.notificationRepository.save(notification);

    // Send notification
    const payload = {
      notification: {
        title,
        body: message,
      },
    };

    try {
      const response = await this.fcmService.sendNotification(
        fcmToken.token,
        payload,
      );
      return response; // Return the response from FCM
    } catch (error) {
      console.error(`Failed to send notification: ${error.message}`);
      // Optionally, delete the notification if sending fails
      await this.notificationRepository.delete(savedNotification.id);
      return {
        success: false,
        message: `Failed to send notification: ${error.message}`,
        response: null,
      };
    }
  }

  async sendNotificationToUser(
    userId: string,
    payload: admin.messaging.MessagingPayload,
  ): Promise<any> {
    const userToken = await this.fcmTokenService.getTokenByUserId(userId);

    if (!userToken || !userToken.token) {
      throw new Error("No FCM token found for this user.");
    }

    try {
      const response = await this.fcmService.sendNotification(
        userToken.token,
        payload,
      );
      return response; // Return the response from FCM
    } catch (error) {
      console.error(`Failed to send notification: ${error.message}`);
      return {
        success: false,
        message: `Failed to send notification: ${error.message}`,
        response: null,
      };
    }
  }

  async sendNotificationToMultipleUsers(
    userIds: string[],
    title: string,
    message: string,
  ): Promise<any> {
    const tokens = await Promise.all(
      userIds.map(async (userId) => {
        const userToken = await this.fcmTokenService.getTokenByUserId(userId);
        return userToken ? userToken.token : null;
      }),
    );

    const validTokens = tokens.filter((token) => token !== null);

    if (validTokens.length === 0) {
      return {
        success: false,
        message: "No valid FCM tokens found for the users.",
        response: null,
      };
    }

    const payload = {
      notification: {
        title,
        body: message,
      },
    };

    try {
      const response = await this.fcmService.sendNotificationToMultipleDevices(
        validTokens,
        payload,
      );
      return response; // Return the response from FCM
    } catch (error) {
      console.error(`Failed to send notification: ${error.message}`);
      return {
        success: false,
        message: `Failed to send notification: ${error.message}`,
        response: null,
      };
    }
  }

  async markAsSeen(notificationId: string): Promise<any> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId },
      });
      if (!notification) {
        return {
          success: false,
          message: "Notification not found",
          response: null,
        };
      }
      notification.seenAt = new Date();
      const updatedNotification =
        await this.notificationRepository.save(notification);
      return {
        success: true,
        message: "Notification marked as seen",
        response: updatedNotification,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to mark notification as seen: ${error.message}`,
        response: null,
      };
    }
  }
}
