import { Module } from '@nestjs/common';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity } from './entities/branch.entity';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  imports: [TypeOrmModule.forFeature([BranchEntity])],
  controllers: [BranchController,],
  providers: [BranchService,CloudinaryService],
})
export class BranchModule {}
