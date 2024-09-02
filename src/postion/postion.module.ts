import { Module } from '@nestjs/common';
import { PostionService } from './postion.service';
import { PostionController } from './postion.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionEntity } from './entities/postion.entity';
import { EmployeeEntity } from 'src/employee/entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PositionEntity,EmployeeEntity])],
  controllers: [PostionController],
  providers: [PostionService],
})
export class PostionModule {}
