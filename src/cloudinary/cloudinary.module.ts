import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { Cloudinary } from './cloudinary/cloudinary';
import { CloudinaryProvider } from './cloudinary/cloudinary.provider';

@Module({
  providers: [CloudinaryProvider,CloudinaryService, Cloudinary],
  exports:[CloudinaryProvider,CloudinaryService]
})
export class CloudinaryModule {}
