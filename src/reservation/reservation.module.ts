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
import { SlotsEntity } from "../slots/entities/slots.entity";
import { WorkingEntity } from "../slots/entities/working.entity";
import { ReceiptService } from "../receipt/receipt.service";
import { OrdersService } from "../orders/orders.service";
import { OrderEntity } from "../orders/entities/order.entity";


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
      SlotsEntity,
      OrderEntity,
      UserEntity
    ]),
  ],
  controllers: [ReservationController],
  providers: [ReservationService, OrdersService, CloudinaryService // Add OrdersService here
    // ReceiptService
  ],
  exports: [ReservationService],
})
export class ReservationModule {}
