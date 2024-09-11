import { Module } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { ReceiptController } from './receipt.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptEntity } from './entities/receipt.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { UserEntity } from '../user/entities/user.entity';
import { ServiceEntity } from '../service/entities/service.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReceiptEntity,
      OrderEntity,
      UserEntity,
      ServiceEntity,
    ]),
  ],
  controllers: [ReceiptController],
  providers: [ReceiptService],
})
export class ReceiptModule {}
