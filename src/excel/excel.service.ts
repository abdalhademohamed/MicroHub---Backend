import { Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";
// import * as pdfMake from "pdfmake/build/pdfmake";
// import * as pdfFonts from "pdfmake/build/vfs_fonts";

@Injectable()
export class ExcelService {
  constructor(private cloudinaryService: CloudinaryService) {}

  async generateAndUploadExcel(data: any[], fileName: string) {
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
    return { fileUrl }; // Return the Cloudinary file URL
  }

  private extractHeaders(data: any[]): string[] {
    const headers = new Set<string>();
    data.forEach((item) => {
      Object.keys(item).forEach((key) => headers.add(key));
    });
    return Array.from(headers);
  }
  // // Convert Excel buffer to PDF
  // async convertExcelBufferToPdf(excelBuffer: Buffer, fileName: string) {
  //   try {
  //     // Step 1: Load the Excel buffer using ExcelJS
  //     const workbook = new ExcelJS.Workbook();
  //     await workbook.xlsx.load(excelBuffer);

  //     // Step 2: Extract data from the first sheet
  //     const worksheet = workbook.worksheets[0];
  //     const headers = this.extractHeadersFromExcel(worksheet);
  //     const rows = this.extractRowsFromExcel(worksheet, headers);

  //     // Step 3: Generate PDF using pdfMake
  //     const docDefinition: any = {
  //       content: [
  //         {
  //           table: {
  //             headerRows: 1,
  //             widths: Array(headers.length).fill("*"), // Auto widths for columns
  //             body: [headers, ...rows], // Add headers and rows to the table
  //           },
  //           style: "tableStyle",
  //         },
  //       ],
  //       // styles: {
  //       //   tableStyle: {
  //       //     margin: [0, 5, 0, 15], // [top, right, bottom, left]
  //       //     fontSize: 10,
  //       //   },
  //       // },
  //       defaultStyle: {
  //         font: 'Times' // Default font set to Times
  //       }
  //     };

  //     // Step 4: Generate PDF buffer from pdfMake
  //     const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
  //       pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
  //         if (buffer) {
  //           resolve(buffer);
  //         } else {
  //           reject(new Error("Error generating PDF"));
  //         }
  //       });
  //     });

  //     // Step 5: Upload the generated PDF buffer to Cloudinary (or return the buffer)
  //     const fileUrl = await this.cloudinaryService.uploadPdfToCloudinary(pdfBuffer, fileName);
  //     return { fileUrl }; // Return the Cloudinary file URL for the PDF

  //   } catch (error) {
  //     console.error("Error converting Excel to PDF:", error);
  //     throw new Error("Failed to convert Excel to PDF");
  //   }
  // }
  // private extractHeadersFromExcel(worksheet: ExcelJS.Worksheet): string[] {
  //   const headers: string[] = [];
  //   worksheet.getRow(1).eachCell((cell) => {
  //     headers.push(cell.text);
  //   });
  //   return headers;
  // }

  // // Extract rows from the Excel worksheet, skipping the header row
  // private extractRowsFromExcel(worksheet: ExcelJS.Worksheet, headers: string[]): string[][] {
  //   const rows: string[][] = [];
  //   worksheet.eachRow((row, rowIndex) => {
  //     if (rowIndex > 1) { // Skip the header row (index 1)
  //       const rowData: string[] = [];
  //       headers.forEach((header, index) => {
  //         rowData.push(row.getCell(index + 1).text); // Extract data from each column
  //       });
  //       rows.push(rowData);
  //     }
  //   });
  //   return rows;
  // }
  private flattenValue(value: any): string {
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value);
    }
    return value;
  }
}


