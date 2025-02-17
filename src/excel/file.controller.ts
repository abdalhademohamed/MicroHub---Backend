import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ExcelService } from "./excel.service";
import { page } from "pdfkit";

@Controller("report-history")
export class ReportController {
  constructor(private excelService: ExcelService) {}
  @Get()
  getFileHistory(@Query("page") page: number, @Query("limit") limit: number) {
    return this.excelService.getAllFiles(page, limit);
  }
}
