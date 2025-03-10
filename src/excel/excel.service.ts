import { BadRequestException, Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { Response } from "express";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";
import { InjectRepository } from "@nestjs/typeorm";
import { FileEntity } from "./entities/file.entity";
import { Repository } from "typeorm";

@Injectable()
export class ExcelService {
  constructor(
    private cloudinaryService: CloudinaryService,
    @InjectRepository(FileEntity)
    private fileRepository: Repository<FileEntity>,
  ) {}

  async getAllFiles(page: number, limit: number) {
    page ||= 1;
    limit ||= 10;
    const queryBuilder = this.fileRepository.createQueryBuilder("files");
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { items: data, total, page, limit };
  }
  async exportFile(
    data: any[],
    res: Response,
    type: string,
    totalValues: Record<string, number>,
    fromDate: string,
    toDate: string,
  ) {
    if (type === "excel") {
      await this.generateAndUploadExcel(data, res, totalValues, fromDate, toDate);
    } else if (type === "pdf") {
      await this.generateAndUploadPdfFromHtmlTable(data, res, totalValues, fromDate, toDate);
    } else {
      throw new BadRequestException("Unsupported file type");
    }
  }

  private async generateAndUploadExcel(
    data: any[],
    res: Response,
    totalValues?: Record<string, number>,
    fromDate?: string,
    toDate?: string,
    branch?: string,
  ) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet1");

    const headers = this.extractHeaders(data);
    const headerRow = worksheet.addRow(headers);
    worksheet.columns = headers.map(() => ({ width: 20 }));

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF800000" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    data.forEach((item, index) => {
      const rowValues = headers.map((key) => item[key]);
      const row = worksheet.addRow(rowValues);
      const isOddRow = index % 2 === 0;
      row.height = 25;
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isOddRow ? "FF165016" : "FFFFC0CB" },
        };
        cell.font = { color: { argb: isOddRow ? "FFFFFFFF" : "FF000000" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
    });

    if (totalValues) {
      const totalRowValues = headers.map((key, colIndex) =>
        colIndex === 0 ? "Total" : totalValues[key] ?? "",
      );
      const totalRow = worksheet.addRow(totalRowValues);
      totalRow.height = 30;
      totalRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF00008B" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      worksheet.addRow(["From Date:", fromDate || "all time"]);
      worksheet.addRow(["To Date:", toDate || "all time"]);
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await this.cloudinaryService.uploadToCloudinary(buffer);

    await this.fileRepository.save({ link: url, type: "excel", createdAt: new Date() });
    res.status(200).json({ url });
  }

  private async generateAndUploadPdfFromHtmlTable(
    data: any[],
    res: Response,
    totalValues?: Record<string, number>,
    fromDate?: string,
    toDate?: string,
  ) {
    const htmlTable = this.generateHtmlTable(data, totalValues, fromDate, toDate);
    res.status(200).json({ url: htmlTable });
  }

  private generateHtmlTable(
    data: any[],
    totalValues?: Record<string, number>,
    fromDate?: string,
    toDate?: string,
  ): string {
    const headers = this.extractHeaders(data);
    const headerRow = `<tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>`;

    const rows = data.map((item, index) => {
      const cells = headers.map((key) => `<td>${item[key]}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");

    let totalRow = "";
    if (totalValues) {
      const totalRowCells = headers.map((key, colIndex) =>
        colIndex === 0 ? "<b>Total</b>" : totalValues[key] ?? "",
      ).join("");
      totalRow = `<tr style="background-color: #00008B; color: white; font-weight: bold;">${totalRowCells}</tr>`;
    }

    return `
      <html>
        <body>
          <table border="1">
            ${headerRow}${rows}${totalRow}
            <tr><td><b>From Date:</b></td><td>${fromDate || "N/A"}</td></tr>
            <tr><td><b>To Date:</b></td><td>${toDate || "N/A"}</td></tr>
          </table>
        </body>
      </html>
    `;
  }

  private extractHeaders(data: any[]): string[] {
    const headers = new Set<string>();
    data.forEach((item) => Object.keys(item).forEach((key) => headers.add(key)));
    return Array.from(headers);
  }
}
