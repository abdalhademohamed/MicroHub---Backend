import { Module } from '@nestjs/common';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { Branch } from './entities/branch.entity';

@Module({

    providers: [BranchService],
    controllers: [BranchController],
    imports: [
        TypeOrmModule.forFeature([Branch])
    ],
})
export class BranchModule {}
