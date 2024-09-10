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

@Module({
  
  imports: [TypeOrmModule.forFeature([EmployeeEntity,BranchEntity,PositionEntity,EmployeeTypeEntity]), ArtistModule],
  controllers: [EmployeeController],
  providers: [EmployeeService,CloudinaryService],
})
export class EmployeeModule {}
