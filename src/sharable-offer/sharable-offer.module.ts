import { Module } from '@nestjs/common';
import { SharableOfferService } from './sharable-offer.service';
import { SharableOfferController } from './sharable-offer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharableOfferEntity } from './entities/sharable-offer.entity';
import { ServiceEntity } from '../service/entities/service.entity';
import { BranchEntity } from '../branch/entities/branch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SharableOfferEntity,ServiceEntity,BranchEntity])],

  controllers: [SharableOfferController],
  providers: [SharableOfferService],
})
export class SharableOfferModule {}
