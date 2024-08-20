import { Module } from '@nestjs/common';
import { RootoshService } from './rootosh.service';
import { RootoshController } from './rootosh.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RootoshEntity } from './entities/rootosh.entity';
import { ServiceEntity } from '../service/entities/service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RootoshEntity,ServiceEntity]),],

  controllers: [RootoshController],
  providers: [RootoshService],
})
export class RootoshModule {}
