import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchModule } from './branch/branch.module';
import { OfferModule } from './offer/offer.module';
import { ServiceModule } from './service/service.module';
import { ReservationModule } from './reservation/reservation.module';
import { RootoshModule } from './rootosh/rootosh.module';
import { EmployeeModule } from './employee/employee.module';
import { PostionModule } from './postion/postion.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { CloudinaryProvider } from './cloudinary/cloudinary/cloudinary.provider';
import { AcceptLanguageResolver, HeaderResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { CustomerModule } from './customer/customer.module';
import * as path from 'path';
import { UserEntity } from './user/entities/user.entity';
import { BranchEntity } from './branch/entities/branch.entity';
import { CustomerEntity } from './customer/entities/customer.entity';
import { EmployeeEntity } from './employee/entities/employee.entity';
import { PositionEntity } from './postion/entities/postion.entity';
import { ReservationEntity } from './reservation/entities/reservation.entity';
import { ServiceEntity } from './service/entities/service.entity';
import { RootoshEntity } from './rootosh/entities/rootosh.entity';



@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }), 

    TypeOrmModule.forRoot({
      // type:'postgres',
      // host: 'localhost',
      // port: 5432,
      // username: process.env.POSTGRES_USER,
      // password: process.env.POSTGRES_PASSWORD,
      // database: process.env.POSTGRES_DB,
      // entities: ['dist/**/*.entity{.ts,.js}'],
      // autoLoadEntities: true,
      // synchronize: true,
      // // logging: true,

      type: 'postgres',
      host: process.env.DB_HOST , // Neon host
      port: parseInt(process.env.DB_PORT, 10),
      username: process.env.DB_USER ,
      password: process.env.DB_PASSWORD ,
      database: process.env.DB_NAME ,
      // entities: ["dist/**/*.entity.js"], 
      entities:[UserEntity,BranchEntity,CustomerEntity,EmployeeEntity,PositionEntity,ReservationEntity,ServiceEntity,RootoshEntity],
      synchronize: true, // Set to false in production
      ssl: true, // Neon typically requires SSL connections
      extra: {
        ssl: {
          rejectUnauthorized: false, // Required for self-signed certificates
        },
      },


    }),


    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '../src/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
        // new HeaderResolver(['x-lang']),
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
    CustomerModule
  ],
  controllers: [AppController],
  providers: [AppService,CloudinaryProvider],
})
export class AppModule {}
