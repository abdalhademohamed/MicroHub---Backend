import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeEntity } from './entities/employee.entity';
import { BranchEntity } from '../branch/entities/branch.entity';
import { PositionEntity } from '../postion/entities/postion.entity';
import { EmployeeTypeEntity } from '../employetype/entities/employetype.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ArtistModule } from './artist/artist.module';
import { AuthService } from '../auth/auth.service';
import { AuthModule } from '../auth/auth.module';
import { UserEntity } from '../user/entities/user.entity';
import { AuditLogEntity } from '../audit-log/entities/audit.log.entity';

@Module({
  
  imports: [
    TypeOrmModule.forFeature([
      EmployeeEntity,
      BranchEntity,
      PositionEntity,
      EmployeeTypeEntity,
      UserEntity,
      AuditLogEntity
    ]),
    ArtistModule,
    AuthModule, // Import AuthModule to make AuthService available
  ],  controllers: [EmployeeController],
  providers: [EmployeeService,CloudinaryService],
  exports:[EmployeeService]
})
export class EmployeeModule {}
