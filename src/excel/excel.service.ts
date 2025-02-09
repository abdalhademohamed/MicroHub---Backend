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
    @InjectRepository(FileEntity) private fileRepository: Repository<FileEntity>,
  ) {}

  async getAllFiles(page: number, limit: number) {
    page ||= 1;
    limit ||= 10;
    const queryBuilder = this.fileRepository.createQueryBuilder('files');
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { items: data, total, page, limit };
  }

  async exportFile(data: any[], res: Response, type: string) { 
    if (type === "excel") {
      await this.generateAndUploadExcel(data, res);
    } else if (type === "pdf") {
      await this.generateAndUploadPdfFromHtmlTable(data, res);
    } else {
      throw new BadRequestException("Unsupported file type");
    }
  }

  private async generateAndUploadExcel(data: any[], res: Response) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet1");

    const headers = this.extractHeaders(data);
    const headerRow = worksheet.addRow(headers);

    // Apply Header Styles (Dark Red Background, White Text)
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White text
      cell.fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: 'FF800000' } // Dark Red Background
      };
    });

    // Apply Row Styles (Alternating Dark Green & Light Pink)
    data.forEach((item, index) => {
      const rowValues = headers.map((key) => this.flattenValue(item[key]));
      const row = worksheet.addRow(rowValues);
      
      const isOddRow = index % 2 === 0;
      row.eachCell((cell) => {
        cell.fill = { 
          type: 'pattern', 
          pattern: 'solid', 
          fgColor: { argb: isOddRow ? 'FF165016' : 'FFFFC0CB' } // Dark Green & Light Pink
        };
        cell.font = { color: { argb: isOddRow ? 'FFFFFFFF' : 'FF000000' } }; // White for green, Black for pink
      });
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await this.cloudinaryService.uploadToCloudinary(buffer);
    
    const action = this.fileRepository.create({
      link: url,
      type: "excel",
      createdAt: new Date()
    });
    await this.fileRepository.save(action);
    res.status(200).json({ url });
  }

  private async generateAndUploadPdfFromHtmlTable(data: any[], res: Response) {
    try {
      const htmlTable = this.generateHtmlTable(data);
      const url = htmlTable;
  
      const action = this.fileRepository.create({
        link: url,
        type: 'pdf',
        createdAt: new Date(),
      });
      await this.fileRepository.save(action);
  
      res.status(200).json({ url });
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }

  private extractHeaders(data: any[]): string[] {
    const headers = new Set<string>();
    data.forEach((item) => Object.keys(item).forEach((key) => headers.add(key)));
    return Array.from(headers);
  }

  private flattenValue(value: any): string {
    return typeof value === "object" && value !== null ? JSON.stringify(value) : value;
  }

  private generateHtmlTable(data: any[]): string {
    const headers = this.extractHeaders(data);
    const headerRow = `<tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>`;
    const rows = data
      .map((item, index) => {
        const cells = headers.map((key) => `<td>${this.flattenValue(item[key])}</td>`).join("");
        const rowColor = index % 2 === 0 ? "darkgreen" : "lightpink";
        const textColor = index % 2 === 0 ? "white" : "black";
        return `<tr style="background-color: ${rowColor}; color: ${textColor};">${cells}</tr>`;
      })
      .join("");

    return `
      <html>
        <head>
          <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 8px; text-align: center; }
            th { background-color: #800000; color: white; } /* Dark Red Header */
            tr:nth-child(odd) { background-color: #165016; color: white; } /* Dark Green */
            tr:nth-child(even) { background-color: #FFC0CB; color: black; } /* Light Pink */
          </style>
        </head>
        <body>
          <table>${headerRow}${rows}</table>
        </body>
      </html>
    `;
  }
}
