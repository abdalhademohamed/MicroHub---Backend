import { Module } from '@nestjs/common';
import { OfferService } from './offer.service';
import { OfferController } from './offer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceEntity } from '../service/entities/service.entity';
import { OfferEntity } from './entities/offer.entity';
import { BranchEntity } from '../branch/entities/branch.entity';

@Module({
 
  imports: [TypeOrmModule.forFeature([OfferEntity,ServiceEntity,BranchEntity])],
  controllers: [OfferController],
  providers: [OfferService],
})
export class OfferModule {}
