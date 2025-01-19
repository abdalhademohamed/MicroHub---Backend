import { Module } from "@nestjs/common";
import { ExcelService } from "./excel.service";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";

@Module({
  imports: [CloudinaryModule],
  providers: [ExcelService],
  exports: [ExcelService],
})
export class ExcelModule {}