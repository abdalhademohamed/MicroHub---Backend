import { Module } from "@nestjs/common";
import { EmployeeService } from "./employee.service";
import { EmployeeController } from "./employee.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmployeeEntity } from "./entities/employee.entity";
import { BranchEntity } from "../branch/entities/branch.entity";
import { PositionEntity } from "../postion/entities/postion.entity";
import { EmployeeTypeEntity } from "../employetype/entities/employetype.entity";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { ArtistModule } from "./artist/artist.module";
import { AuthService } from "../auth/auth.service";
import { AuthModule } from "../auth/auth.module";
import { UserEntity } from "../user/entities/user.entity";
import { AuditLogEntity } from "../audit-log/entities/audit.log.entity";
import { SlotModule } from "../slots/slot.module";
import { WorkingEntity } from "../slots/entities/working.entity";
import { SlotsEntity } from "../slots/entities/slots.entity";
import { ReservationEntity } from "../reservation/entities/reservation.entity";
import { CustomI18nService } from "../common/custom.18n.service";

@Module({
  imports: [
    SlotModule,
    TypeOrmModule.forFeature([
      EmployeeEntity,
      BranchEntity,
      PositionEntity,
      EmployeeTypeEntity,
      UserEntity,
      AuditLogEntity,
      WorkingEntity,
      SlotsEntity,
      ReservationEntity,
    ]),
    ArtistModule,
    AuthModule, // Import AuthModule to make AuthService available
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService, CloudinaryService, CustomI18nService],
  exports: [EmployeeService],
})
export class EmployeeModule {}