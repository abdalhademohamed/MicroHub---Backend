import { Module } from '@nestjs/common';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity } from './entities/branch.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { I18nService } from 'nestjs-i18n';
import { ReservationEntity } from '../reservation/entities/reservation.entity';
import { WorkingBranchEntity } from '../working-branch/entities/working.branch.entity';
import { UserService } from '../user/user.service';
import { AuditLogEntity } from '../audit-log/entities/audit.log.entity';
import { UserEntity } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BranchEntity, WorkingBranchEntity, ReservationEntity,AuditLogEntity,UserEntity]),
  ],  controllers: [BranchController,],
  providers: [BranchService,CloudinaryService,UserService],
})
export class BranchModule {}
