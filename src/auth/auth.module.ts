import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UserEntity } from "../user/entities/user.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { MailService } from "../user/utils/Email.Service";
// import { ConfigService } from "@nestjs/config";
import { AccessTokenStrategy } from "./accessToken.strategy";
import { RefreshTokenStrategy } from "./refreshToken.strategy";
import { CustomI18nService } from "../common/custom.18n.service";
import { BranchEntity } from "../branch/entities/branch.entity";
import { EmployeeTypeEntity } from "../employetype/entities/employetype.entity";
import { PositionEntity } from "../postion/entities/postion.entity";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { SlotModule } from "../slots/slot.module";

@Module({
  imports: [
    SlotModule,
    TypeOrmModule.forFeature([
      UserEntity,
      BranchEntity,
      EmployeeTypeEntity,
      EmployeeEntity,
      PositionEntity,
    ]),
    PassportModule.register({ defaultStrategy: "jwt" }),
    // JwtModule.registerAsync({
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => ({
    //     secret: config.get<string>('JWT_SECRET'),
    //     signOptions: {
    //       expiresIn: config.get<string | number>('JWT_EXPIRE'),
    //     },
    //   }),
    // }),
    JwtModule.register({}),
  ],
  providers: [
    AuthService,
    MailService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    CustomI18nService,
  ],

  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
