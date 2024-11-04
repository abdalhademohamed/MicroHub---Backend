import { Module } from "@nestjs/common";
import { EmployetypeService } from "./employetype.service";
import { EmployetypeController } from "./employetype.controller";
import { EmployeeTypeEntity } from "./entities/employetype.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { CustomI18nService } from "../common/custom.18n.service";

@Module({
  imports: [TypeOrmModule.forFeature([EmployeeTypeEntity, EmployeeEntity])],
  controllers: [EmployetypeController],
  providers: [
    EmployetypeService,
    CustomI18nService,
  ],
})
export class EmployetypeModule {}
