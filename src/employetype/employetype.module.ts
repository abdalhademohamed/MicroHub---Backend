import { Module } from '@nestjs/common';
import { EmployetypeService } from './employetype.service';
import { EmployetypeController } from './employetype.controller';
import { EmployeeTypeEntity } from './entities/employetype.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeEntity } from 'src/employee/entities/employee.entity';

@Module({
  imports:[TypeOrmModule.forFeature([EmployeeTypeEntity,EmployeeEntity])],
  controllers: [EmployetypeController],
  providers: [EmployetypeService],
})
export class EmployetypeModule {}
