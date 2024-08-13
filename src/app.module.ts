import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './config/databaseConfig';
import { BranchModule } from './branch/branch.module';

@Module({
  imports: [AuthModule, DatabaseModule, BranchModule],
})
export class AppModule {}

