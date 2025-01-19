import { Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";

@Injectable()
export class ExcelService {
  constructor(private cloudinaryService: CloudinaryService) {}

  async generateAndUploadExcel(data: any[], fileName: string): Promise<string> {
    console.log(data)
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet1");

    // Extract headers
    const headers = this.extractHeaders(data);
    worksheet.addRow(headers).font = { bold: true };

    // Add data rows
    data.forEach((item) => {
      const rowValues = headers.map((key) => this.flattenValue(item[key]));
      worksheet.addRow(rowValues);
    });

    // Generate buffer from workbook
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileUrl = await this.cloudinaryService.uploadToCloudinary(buffer, fileName);
    return fileUrl; // Return the Cloudinary file URL
  }

  private extractHeaders(data: any[]): string[] {
    const headers = new Set<string>();
    data.forEach((item) => {
      Object.keys(item).forEach((key) => headers.add(key));
    });
    return Array.from(headers);
  }

  private flattenValue(value: any): string {
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value);
    }
    return value;
  }
}


