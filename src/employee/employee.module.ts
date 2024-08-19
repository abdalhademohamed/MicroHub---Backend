import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeEntity } from './entities/employee.entity';
import { BranchEntity } from '../branch/entities/branch.entity';
import { PositionEntity } from '../postion/entities/postion.entity';

@Module({
  
  imports: [TypeOrmModule.forFeature([EmployeeEntity,BranchEntity,PositionEntity])],
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class EmployeeModule {}
