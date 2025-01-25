import { Module } from "@nestjs/common";
import { ExcelService } from "./excel.service";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FileEntity } from "./entities/file.entity";
import { ReportController } from "./file.controller";

@Module({
  imports: [CloudinaryModule, TypeOrmModule.forFeature([FileEntity])],
  providers: [ExcelService],
  exports: [ExcelService],
  controllers: [ReportController],
})
export class ExcelModule {}