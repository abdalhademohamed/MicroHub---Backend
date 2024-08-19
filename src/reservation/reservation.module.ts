import { Module } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationEntity } from './entities/reservation.entity';
import { BranchEntity } from '../branch/entities/branch.entity';
import { ServiceEntity } from '../service/entities/service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReservationEntity,BranchEntity,ServiceEntity])],
  controllers: [ReservationController],
  providers: [ReservationService],
})
export class ReservationModule {}
