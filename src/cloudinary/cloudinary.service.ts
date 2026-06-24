import { Injectable } from "@nestjs/common";
import 'multer'; // 👈 هذا السطر يحل الأخطاء الثلاثة الخاصة بـ Multer في كل الملفات
import ImageKit from "@imagekit/nodejs";

@Injectable()
export class CloudinaryService {
  private imagekit: any; // 👈 تعريف المتغير كـ any يحل الأخطاء الثلاثة الخاصة بدالة upload

  constructor() {
    // @ts-ignore // 👈 هذا السطر يمنع TypeScript من إظهار خطأ الخصائص (publicKey)
    this.imagekit = new ImageKit({
      publicKey: "ضع_هنا_Public_Key",
      privateKey: "ضع_هنا_Private_Key",
      urlEndpoint: "ضع_هنا_URL_endpoint"
    }as any );
  }

  async uploadToCloudinary(buffer: Buffer): Promise<string> {
    console.log("uploadToImageKit", buffer);
    return new Promise((resolve, reject) => {
      this.imagekit.upload(
        {
          file: buffer,
          fileName: `excel_${Date.now()}.xlsx`,
          folder: "raw_files",
        },
        (error: any, result: any) => {
          if (error) {
            console.error("ImageKit Upload Error:", error);
            reject(error);
          } else {
            resolve(result.url); 
          }
        }
      );
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folderName: string,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.imagekit.upload(
        {
          file: file.buffer, 
          fileName: file.originalname || `image_${Date.now()}`,
          folder: folderName,
        },
        (error: any, result: any) => {
          if (error) return reject(error);
          // الحفاظ على نفس التنسيق القديم لضمان عمل باقي ملفات المشروع
          resolve({ secure_url: result.url, url: result.url, ...result });
        }
      );
    });
  }

  async uploadPdfToCloudinary(buffer: any): Promise<string> {
    return new Promise((resolve, reject) => {
      this.imagekit.upload(
        {
          file: buffer,
          fileName: `pdf_${Date.now()}.pdf`,
          folder: "pdfs",
        },
        (error: any, result: any) => {
          if (error) {
            console.error("Error uploading to ImageKit:", error);
            return reject(error);
          }
          resolve(result.url);
        }
      );
    });
  }
}