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
    totalValues?: Record<string, number>,
  ) {
    if (type === "excel") {
      await this.generateAndUploadExcel(data, res, totalValues);
    } else if (type === "pdf") {
      await this.generateAndUploadPdfFromHtmlTable(data, res, totalValues);
    } else {
      throw new BadRequestException("Unsupported file type");
    }
  }

  // private async generateAndUploadExcel(
  //   data: any[],
  //   res: Response,
  //   totalValues?: Record<string, number>,
  // ) {
  //   const workbook = new ExcelJS.Workbook();
  //   const worksheet = workbook.addWorksheet("Sheet1");

  //   const headers = this.extractHeaders(data);
  //   const headerRow = worksheet.addRow(headers);

  //   // Apply Header Styles (Dark Red Background, White Text)
  //   headerRow.eachCell((cell) => {
  //     cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // White text
  //     cell.fill = {
  //       type: "pattern",
  //       pattern: "solid",
  //       fgColor: { argb: "FF800000" }, // Dark Red Background
  //     };
  //   });

  //   let columnSums: number[] = new Array(headers.length).fill(0);

  //   // Apply Row Styles (Alternating Dark Green & Light Pink)
  //   data.forEach((item, index) => {
  //     const rowValues = headers.map((key, colIndex) => {
  //       const value = item[key];

  //       // Check if the value is a number and sum it (if totalValues is not provided)
  //       if (!totalValues && !isNaN(value) && value !== "" && value !== null) {
  //         columnSums[colIndex] += Number(value);
  //       }

  //       return value;
  //     });

  //     const row = worksheet.addRow(rowValues);
  //     const isOddRow = index % 2 === 0;

  //     row.eachCell((cell) => {
  //       cell.fill = {
  //         type: "pattern",
  //         pattern: "solid",
  //         fgColor: { argb: isOddRow ? "FF165016" : "FFFFC0CB" }, // Dark Green & Light Pink
  //       };
  //       cell.font = { color: { argb: isOddRow ? "FFFFFFFF" : "FF000000" } }; // White for green, Black for pink
  //     });
  //   });

  //   // Append Total Row Only If totalValues is Provided
  //   if (totalValues) {
  //     const totalRowValues = headers.map((key, colIndex) =>
  //       colIndex === 0
  //         ? "Total"
  //         : totalValues[key] !== undefined
  //           ? totalValues[key]
  //           : "",
  //     );

  //     const totalRow = worksheet.addRow(totalRowValues);

  //     // Apply Style to Total Row (Bold, Dark Blue Background, White Text)
  //     totalRow.eachCell((cell) => {
  //       cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // White text
  //       cell.fill = {
  //         type: "pattern",
  //         pattern: "solid",
  //         fgColor: { argb: "FF00008B" }, // Dark Blue Background
  //       };
  //     });
  //   }

  //   const arrayBuffer = await workbook.xlsx.writeBuffer();
  //   const buffer = Buffer.from(arrayBuffer);
  //   const url = await this.cloudinaryService.uploadToCloudinary(buffer);

  //   const action = this.fileRepository.create({
  //     link: url,
  //     type: "excel",
  //     createdAt: new Date(),
  //   });
  //   await this.fileRepository.save(action);

  //   res.status(200).json({ url });
  // }
  private async generateAndUploadExcel(
    data: any[],
    res: Response,
    totalValues?: Record<string, number>,
  ) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet1");
  
    const headers = this.extractHeaders(data);
    const headerRow = worksheet.addRow(headers);
  
    // **Set Column Widths** (Adjust as needed)
    worksheet.columns = headers.map(() => ({
      width: 20, // Increase column width
    }));
  
    // **Apply Header Styles (Dark Red Background, White Text)**
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // White text
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF800000" }, // Dark Red Background
      };
      cell.alignment = { horizontal: "center", vertical: "middle" }; // Center text
    });
  
    let columnSums: number[] = new Array(headers.length).fill(0);
  
    // **Apply Row Styles (Alternating Dark Green & Light Pink)**
    data.forEach((item, index) => {
      const rowValues = headers.map((key, colIndex) => {
        const value = item[key];
  
        // **Check if value is a number & sum it (if totalValues is not provided)**
        if (!totalValues && !isNaN(value) && value !== "" && value !== null) {
          columnSums[colIndex] += Number(value);
        }
  
        return value;
      });
  
      const row = worksheet.addRow(rowValues);
      const isOddRow = index % 2 === 0;
  
      // **Set Row Height** (Increase row height)
      row.height = 25;
  
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isOddRow ? "FF165016" : "FFFFC0CB" }, // Dark Green & Light Pink
        };
        cell.font = { color: { argb: isOddRow ? "FFFFFFFF" : "FF000000" } }; // White for green, Black for pink
        cell.alignment = { horizontal: "center", vertical: "middle" }; // Center text
      });
    });
  
    // **Append Total Row If totalValues is Provided**
    if (totalValues) {
      const totalRowValues = headers.map((key, colIndex) =>
        colIndex === 0
          ? "Total"
          : totalValues[key] !== undefined
            ? totalValues[key]
            : "",
      );
  
      const totalRow = worksheet.addRow(totalRowValues);
      totalRow.height = 30; // **Increase Total Row Height**
  
      // **Apply Style to Total Row (Bold, Dark Blue Background, White Text)**
      totalRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // White text
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF00008B" }, // Dark Blue Background
        };
        cell.alignment = { horizontal: "center", vertical: "middle" }; // Center text
      });
    }
  
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await this.cloudinaryService.uploadToCloudinary(buffer);
  
    const action = this.fileRepository.create({
      link: url,
      type: "excel",
      createdAt: new Date(),
    });
    await this.fileRepository.save(action);
  
    res.status(200).json({ url });
  }
  

  private async generateAndUploadPdfFromHtmlTable(data: any[], res: Response, totalValues?: Record<string, number>,) {
    try {
      const htmlTable = this.generateHtmlTable(data, totalValues);
      const url = htmlTable;

      const action = this.fileRepository.create({
        link: url,
        type: "pdf",
        createdAt: new Date(),
      });
      await this.fileRepository.save(action);

      res.status(200).json({ url });
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  }

  private extractHeaders(data: any[]): string[] {
    const headers = new Set<string>();
    data.forEach((item) =>
      Object.keys(item).forEach((key) => headers.add(key)),
    );
    return Array.from(headers);
  }

  private flattenValue(value: any): string {
    return typeof value === "object" && value !== null
      ? JSON.stringify(value)
      : value;
  }

  private generateHtmlTable(data: any[], totalValues?: Record<string, number>): string {
    const headers = this.extractHeaders(data);
    
    // Generate Table Headers
    const headerRow = `<tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>`;

    // Generate Data Rows with Alternating Colors
    const rows = data
      .map((item, index) => {
        const cells = headers
          .map((key) => `<td>${this.flattenValue(item[key])}</td>`)
          .join("");
        
        const isOddRow = index % 2 === 0;
        const rowColor = isOddRow ? "#165016" : "#FFC0CB"; // Dark Green & Light Pink
        const textColor = isOddRow ? "white" : "black";

        return `<tr style="background-color: ${rowColor}; color: ${textColor};">${cells}</tr>`;
      })
      .join("");

    // Add Total Row If `totalValues` Is Provided
    let totalRow = "";
    if (totalValues) {
      const totalRowCells = headers.map((key, colIndex) => 
        colIndex === 0 ? "<b>Total</b>" : totalValues[key] !== undefined ? totalValues[key] : ""
      ).join("");

      totalRow = `
        <tr style="background-color: #00008B; color: white; font-weight: bold;">
          ${totalRowCells}
        </tr>`;
    }

    // Final HTML Table
    return `
      <html>
        <head>
          <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 8px; text-align: center; }
            th { background-color: #800000; color: white; } /* Dark Red Header */
            tr:nth-child(odd) { background-color: #165016; color: white; } /* Dark Green */
            tr:nth-child(even) { background-color: #FFC0CB; color: black; } /* Light Pink */
            tr:last-child { background-color: #00008B; color: white; font-weight: bold; } /* Dark Blue Total Row */
          </style>
        </head>
        <body>
          <table>${headerRow}${rows}${totalRow}</table>
        </body>
      </html>
    `;
  }
}
