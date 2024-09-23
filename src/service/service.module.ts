import { Module } from "@nestjs/common";
import { ServiceService } from "./service.service";
import { ServiceController } from "./service.controller";
import { ServiceEntity } from "./entities/service.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CloudinaryService } from "../cloudinary/cloudinary.service";

@Module({
  imports: [TypeOrmModule.forFeature([ServiceEntity])],
  controllers: [ServiceController],
  providers: [ServiceService, CloudinaryService],
})
export class ServiceModule {}
