import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService {
  constructor(private configService: ConfigService) {
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
        privateKey,
        clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
      }),
    });
  }

  // async sendNotification(token: string, payload: admin.messaging.MessagingPayload): Promise<string> {
  //   try {
  //     const response = await admin.messaging().send({
  //       token,
  //       ...payload,
  //     });
  //     return response;
  //   } catch (error) {
  //     throw new Error(`Failed to send notification: ${error.message}`);
  //   }
  // }
  async sendNotification(token: string, payload: admin.messaging.MessagingPayload): Promise<any> {
    try {
      const response = await admin.messaging().send({
        token,
        ...payload,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              contentAvailable: true,
              sound: 'default',
            },
          },
        },
      });

      return {
        success: true,
        message: 'Notification sent successfully',
        response,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send notification: ${error.message}`,
        response: null,
      };
    }
  }

  async sendNotificationToMultipleDevices(tokens: string[], payload: admin.messaging.MessagingPayload): Promise<any> {
    try {
      const response = await admin.messaging().sendMulticast({
        tokens,
        ...payload,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              contentAvailable: true,
              sound: 'default',
            },
          },
        },
      });

      const failedTokens = response.responses
        .map((result, index) => result.error ? { token: tokens[index], error: result.error.message } : null)
        .filter(result => result !== null);

      if (failedTokens.length > 0) {
        return {
          success: false,
          message: 'Failed to send notification to some tokens',
          response: {
            success: false,
            message: 'Some notifications failed',
            failedTokens,
          },
        };
      }

      return {
        success: true,
        message: 'Notification sent successfully to all tokens',
        response,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send notification: ${error.message}`,
        response: null,
      };
    }
  }
}