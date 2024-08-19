import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeEntity } from './entities/employee.entity';
import { BranchEntity } from 'src/branch/entities/branch.entity';
import { PositionEntity } from 'src/postion/entities/postion.entity';

@Module({
  
  imports: [TypeOrmModule.forFeature([EmployeeEntity,BranchEntity,PositionEntity])],
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class EmployeeModule {}
