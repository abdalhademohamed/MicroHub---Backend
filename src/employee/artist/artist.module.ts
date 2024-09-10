import { Module } from '@nestjs/common';
import { ArtistController } from './artist.controller';
import { ArtistService } from './artist.service';
import { EmployeeEntity } from '../entities/employee.entity';
import { CommentEntity } from '../../comment/entities/comment.entity';
import { OrderEntity } from '../../orders/entities/order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, CommentEntity, EmployeeEntity]), // Import the necessary entities
  ],
  controllers: [ArtistController],
  providers: [ArtistService,CloudinaryService]
})
export class ArtistModule {}
