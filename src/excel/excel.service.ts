import { BadRequestException, HttpException, Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
// import * as puppeteer from "puppeteer";
import { Response } from "express";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";
import { InjectRepository } from "@nestjs/typeorm";
import { FileEntity } from "./entities/file.entity";
import { Repository } from "typeorm";
import { promisify } from "util";
import * as htmlToPdf from 'html-pdf-node';

@Injectable()
export class ExcelService {
  constructor(
    private cloudinaryService: CloudinaryService,
    @InjectRepository(FileEntity) private fileRepository: Repository<FileEntity>,
  ){}
  async getAllFiles(page: number, limit: number) {
    page ||= 1;
    limit ||= 10;
    const queryBuilder = this.fileRepository.createQueryBuilder('files');
    queryBuilder.skip((page - 1) * limit).take(limit);
  
    // Execute query and get results
    const [data, total] = await queryBuilder.getManyAndCount();
  
    return {
      items: data,
      total,
      page,
      limit,
    };
  }
  async exportFile(data: any[], res: Response, type: string){ 
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
    worksheet.addRow(headers).font = { bold: true };

    // Add data rows
    data.forEach((item) => {
      const rowValues = headers.map((key) => this.flattenValue(item[key]));
      worksheet.addRow(rowValues);
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await this.cloudinaryService.uploadToCloudinary(buffer);
    const action = this.fileRepository.create({
      link: url,
      type: "excel",
      createdAt: new Date()
    })
    await this.fileRepository.save(action);
    res.status(200).json({ url });
  }

  // private async generateAndUploadPdfFromHtmlTable(data: any[], res: Response) {
  //   const htmlTable = this.generateHtmlTable(data);
  //   const browser = await puppeteer.launch();
  //   const page = await browser.newPage();
  //   await page.setContent(htmlTable, { waitUntil: "networkidle0" });
  //   const pdfBuffer = await page.pdf({
  //     format: "A4",
  //     printBackground: true,
  //   });
  //   await browser.close();
  //   const url = await this.cloudinaryService.uploadPdfToCloudinary(Buffer.from(pdfBuffer));
  //   const action = this.fileRepository.create({
  //     link: url,
  //     type: "pdf",
  //     createdAt: new Date()
  //   })
  //   await this.fileRepository.save(action);
  //   res.status(200).json({ url });
  // }
  private async generateAndUploadPdfFromHtmlTable(data: any[], res: Response) {
    try {
      const htmlTable = this.generateHtmlTable(data);
  
      // Create PDF buffer
      const file = { content: htmlTable };
      // console.log(file.content);
  
      const generatePdfPromise = promisify(htmlToPdf.generatePdf);
    
      const pdfBuffer = await generatePdfPromise(file, {
        format: 'A4',
        printBackground: true,
      });

      // console.log(pdfBuffer);
  
      // Upload to Cloudinary
      const url = await this.cloudinaryService.uploadPdfToCloudinary(Buffer.from(pdfBuffer));
  
      // Save the file metadata to the database
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

  private generateHtmlTable(data: any[]): string {
    const headers = this.extractHeaders(data);
    const headerRow = `<tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>`;
    const rows = data
      .map((item) => {
        const cells = headers.map((key) => `<td>${this.flattenValue(item[key])}</td>`).join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    return `
      <html>
        <head>
          <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <table>${headerRow}${rows}</table>
        </body>
      </html>
    `;
  }
}