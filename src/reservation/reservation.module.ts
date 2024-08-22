import { Module } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationEntity } from './entities/reservation.entity';
import { BranchEntity } from '../branch/entities/branch.entity';
import { ServiceEntity } from '../service/entities/service.entity';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReservationEntity,BranchEntity,ServiceEntity])],
  controllers: [ReservationController],
  providers: [ReservationService,CloudinaryService],
})
export class ReservationModule {}
