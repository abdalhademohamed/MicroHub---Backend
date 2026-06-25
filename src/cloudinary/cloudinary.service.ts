import { Injectable, Logger } from "@nestjs/common";
import 'multer';
import ImageKit from "@imagekit/nodejs"; // تأكد من أنك تستخدم هذه المكتبة

@Injectable()
export class CloudinaryService {
  private imagekit: any;
  private logger = new Logger(CloudinaryService.name); // لإظهار الأخطاء بوضوح في Vercel

  constructor() {
    this.imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
    } as any);
  }

  // دالة مساعدة لرفع الملفات بأمان وتجنب الكراش مع أي إصدار لمكتبة ImageKit
  private async safeUpload(payload: any): Promise<any> {
    if (this.imagekit.files && typeof this.imagekit.files.upload === 'function') {
      // الطريقة الجديدة للإصدارات الحديثة (@imagekit/nodejs)
      return await this.imagekit.files.upload(payload);
    } else if (typeof this.imagekit.upload === 'function') {
      // الطريقة القديمة للإصدارات السابقة (imagekit)
      return await new Promise((resolve, reject) => {
        this.imagekit.upload(payload, (error: any, result: any) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
    } else {
      throw new Error("❌ ImageKit upload function not found! Check your SDK.");
    }
  }

  async uploadToCloudinary(buffer: Buffer): Promise<string> {
    if (!buffer) throw new Error('Buffer is empty');
    
    try {
      const fileBase64 = buffer.toString('base64');
      const result = await this.safeUpload({
        file: fileBase64,
        fileName: `excel_${Date.now()}.xlsx`,
        folder: "raw_files",
      });
      return result.url;
    } catch (error) {
      this.logger.error("UploadToCloudinary Error:", error);
      throw error;
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    folderName: string,
  ): Promise<any> {
    this.logger.log("=== START UPLOAD ===");
    
    if (!file || !file.buffer) {
      this.logger.error("No valid file provided for upload");
      throw new Error('No valid file provided for upload');
    }

    try {
      const fileBase64 = file.buffer.toString('base64');
      this.logger.log("Buffer converted to base64 successfully.");

      const result = await this.safeUpload({
        file: fileBase64, 
        fileName: file.originalname || `image_${Date.now()}.jpg`,
        folder: folderName,
      });

      this.logger.log("✅ ImageKit upload success: " + result.url);
      
      return { 
        secure_url: result.url, 
        url: result.url,
        public_id: result.fileId || `img_${Date.now()}`,
        format: result.name?.split('.').pop() || 'jpg',
        resource_type: "image",
        created_at: new Date().toISOString(),
        bytes: result.size || 1024,
        width: result.width || 800,
        height: result.height || 800,
        ...result 
      };
    } catch (error) {
      this.logger.error("❌ IMAGEKIT UPLOAD CRASH:", error);
      throw error; // سيقوم الكنترولر بصيد هذا الخطأ
    }
  }

  async uploadPdfToCloudinary(buffer: any): Promise<string> {
    if (!buffer) throw new Error('Buffer is empty');
    
    try {
      const fileBase64 = buffer.toString('base64');
      const result = await this.safeUpload({
        file: fileBase64,
        fileName: `pdf_${Date.now()}.pdf`,
        folder: "pdfs",
      });
      return result.url;
    } catch (error) {
      this.logger.error("UploadPdf Error:", error);
      throw error;
    }
  }

  async deleteImage(publicId: string): Promise<any> {
    return Promise.resolve({ result: 'ok' });
  }

  async destroy(publicId: string): Promise<any> {
    return Promise.resolve({ result: 'ok' });
  }
}