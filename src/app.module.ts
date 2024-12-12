import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BranchModule } from "./branch/branch.module";
import { OfferModule } from "./offer/offer.module";
import { ServiceModule } from "./service/service.module";
import { ReservationModule } from "./reservation/reservation.module";
import { RootoshModule } from "./rootosh/rootosh.module";
import { EmployeeModule } from "./employee/employee.module";
import { PostionModule } from "./postion/postion.module";
import { CloudinaryModule } from "./cloudinary/cloudinary.module";
import { CloudinaryProvider } from "./cloudinary/cloudinary/cloudinary.provider";
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from "nestjs-i18n";
import { CustomerModule } from "./customer/customer.module";
import * as path from "path";
import { UserEntity } from "./user/entities/user.entity";
import { BranchEntity } from "./branch/entities/branch.entity";
import { CustomerEntity } from "./customer/entities/customer.entity";
import { EmployeeEntity } from "./employee/entities/employee.entity";
import { PositionEntity } from "./postion/entities/postion.entity";
import { ReservationEntity } from "./reservation/entities/reservation.entity";
import { ServiceEntity } from "./service/entities/service.entity";
import { RootoshEntity } from "./rootosh/entities/rootosh.entity";
import { EmployetypeModule } from "./employetype/employetype.module";
import { EmployeeTypeEntity } from "./employetype/entities/employetype.entity";
import { OfferEntity } from "./offer/entities/offer.entity";
import { PaymentModule } from "./payment/payment.module";
import { PaymentEntity } from "./payment/entities/payment.entity";
import { WorkingBranchModule } from "./working-branch/working.branch.module";
import { WorkingBranchEntity } from "./working-branch/entities/working.branch.entity";
import { NotificationModule } from "./notification/notification.module";
import { NotificationEntity } from "./notification/entities/notification.entity";
import { FcmTokenEntity } from "./notification/entities/fcm.token.entity";
import { AuditLogModule } from "./audit-log/audit.log.module";
import { AuditLogEntity } from "./audit-log/entities/audit.log.entity";
import { ArtistModule } from "./employee/artist/artist.module";
import { CommentModule } from "./comment/comment.module";
import { OrdersModule } from "./orders/orders.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { ReviewEntity } from "./reviews/entities/review.entity";
import { OrderEntity } from "./orders/entities/order.entity";
import { CommentEntity } from "./comment/entities/comment.entity";
import { ReceiptModule } from "./receipt/receipt.module";
import { ReceiptEntity } from "./receipt/entities/receipt.entity";
import { SlotsEntity } from "./slots/entities/slots.entity";
import { WorkingEntity } from "./slots/entities/working.entity";
import { SlotModule } from "./slots/slot.module";
import { AnalysisModule } from "./analysis/analysis.module";
import { AnalysisEntity } from "./analysis/entities/analysis.entity";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { SharableOfferModule } from './sharable-offer/sharable-offer.module';
import { GiftCouponModule } from './gift-coupon/gift-coupon.module';
import { GiftCouponEntity } from "./gift-coupon/entities/gift-coupon.entity";
import { SharableOfferEntity } from "./sharable-offer/entities/sharable-offer.entity";
import { ActionEntity } from "./action/entities/action.entity";
import { ActionModule } from "./action/action.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST, // Neon host
      port: parseInt(process.env.DB_PORT, 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      // entities: ["dist//*.entity.js"],
      entities: [
        UserEntity,
        BranchEntity,
        CustomerEntity,
        EmployeeEntity,
        EmployeeTypeEntity,
        PositionEntity,
        ReservationEntity,
        ServiceEntity,
        RootoshEntity,
        OfferEntity,
        PaymentEntity,
        WorkingBranchEntity,
        NotificationEntity,
        FcmTokenEntity,
        AuditLogEntity,
        ReviewEntity,
        OrderEntity,
        CommentEntity,
        ReceiptEntity,
        SlotsEntity,
        WorkingEntity,
        AnalysisEntity,
        SharableOfferEntity,
        GiftCouponEntity,
        ActionEntity,
      ],
      synchronize: true, // Set to false in production
      ssl: true, // Neon typically requires SSL connections
      extra: {
        ssl: {
          rejectUnauthorized: false, // Required for self-signed certificates
        },
      },
      // logging: true,
    }),

    I18nModule.forRoot({
      fallbackLanguage: "en",
      loaderOptions: {
        path: path.join(__dirname, "../src/i18n/"),
      // //////////////////////////////////////////////////////////////////
        watch: true,
      },
      resolvers: [
        new HeaderResolver(['language']),
      ],
    }),
    AuthModule,
    UserModule,
    BranchModule,
    OfferModule,
    ServiceModule,
    ReservationModule,
    RootoshModule,
    EmployeeModule,
    PostionModule,
    CloudinaryModule,
    CustomerModule,
    EmployetypeModule,
    PaymentModule,
    WorkingBranchModule,
    NotificationModule,
    AuditLogModule,
    ArtistModule,
    CommentModule,
    OrdersModule,
    ReviewsModule,
    ReceiptModule,
    SlotModule,
    AnalysisModule,
    EventEmitterModule.forRoot({ global: true }),
    SharableOfferModule, 
    GiftCouponModule,
    ActionModule, 
  ],
  controllers: [AppController],
  providers: [AppService, CloudinaryProvider], 
})
export class AppModule {}
console.log(process.env.NODE_ENV)