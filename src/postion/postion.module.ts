import { Module } from '@nestjs/common';
import { PostionService } from './postion.service';
import { PostionController } from './postion.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionEntity } from './entities/postion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PositionEntity])],
  controllers: [PostionController],
  providers: [PostionService],
})
export class PostionModule {}
