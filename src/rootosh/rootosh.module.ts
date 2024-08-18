import { Module } from '@nestjs/common';
import { RootoshService } from './rootosh.service';
import { RootoshController } from './rootosh.controller';

@Module({
  controllers: [RootoshController],
  providers: [RootoshService],
})
export class RootoshModule {}
