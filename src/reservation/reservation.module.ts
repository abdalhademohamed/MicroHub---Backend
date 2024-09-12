import { Module } from "@nestjs/common";
import { ReservationService } from "./reservation.service";
import { ReservationController } from "./reservation.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReservationEntity } from "./entities/reservation.entity";
import { BranchEntity } from "../branch/entities/branch.entity";
import { ServiceEntity } from "../service/entities/service.entity";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { CustomerEntity } from "../customer/entities/customer.entity";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { PositionEntity } from "../postion/entities/postion.entity";
import { UserEntity } from "../user/entities/user.entity";
import { WorkingEntity } from "../slots/entities/working.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReservationEntity,
      BranchEntity,
      ServiceEntity,
      CustomerEntity,
      EmployeeEntity,
      PositionEntity,
      UserEntity,
      WorkingEntity,
    ]),
  ],
  controllers: [ReservationController],
  providers: [ReservationService, CloudinaryService],
  exports: [ReservationService],
})
export class ReservationModule {}
