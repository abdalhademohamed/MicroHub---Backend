import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { FcmService } from './fcm.service';
import { FcmTokenService } from './fcm.token.service';
import { FcmTokenEntity } from './entities/fcm.token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity,FcmTokenEntity]),
  ],
  providers: [NotificationService, FcmService, FcmTokenService],

  controllers: [NotificationController],
  exports: [NotificationService, FcmService, FcmTokenService], // Export if needed in other modules

})
export class NotificationModule {}
