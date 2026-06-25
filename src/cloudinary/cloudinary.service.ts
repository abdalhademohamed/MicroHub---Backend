import { Injectable } from "@nestjs/common";
import 'multer';
import ImageKit from "@imagekit/nodejs";

@Injectable()
export class CloudinaryService {
  private imagekit: any;

  constructor() {
    this.imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
    } as any);
  }

  async uploadToCloudinary(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!buffer) return reject(new Error('Buffer is empty'));
      
      const fileBase64 = buffer.toString('base64');
      this.imagekit.upload(
        {
          file: fileBase64,
          fileName: `excel_${Date.now()}.xlsx`,
          folder: "raw_files",
        },
        (error: any, result: any) => {
          if (error) reject(error);
          else resolve(result.url); 
        }
      );
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folderName: string,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log("=== START UPLOAD ===");
      console.log("File received:", file ? "Yes" : "No");
      
      if (!file || !file.buffer) {
        console.log("❌ MULTER ERROR: file or file.buffer is undefined. Vercel Serverless issue!");
        return reject(new Error('No valid file provided for upload'));
      }

      const fileBase64 = file.buffer.toString('base64');
      console.log("Buffer converted to base64 successfully.");

      this.imagekit.upload(
        {
          file: fileBase64, 
          fileName: file.originalname || `image_${Date.now()}.jpg`,
          folder: folderName,
        },
        (error: any, result: any) => {
          if (error) {
            console.log("❌ IMAGEKIT ERROR DETAILS:", error);
            return reject(error);
          }
          
          console.log("✅ ImageKit upload success:", result.url);
          resolve({ 
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
          });
        }
      );
    });
  }

  async uploadPdfToCloudinary(buffer: any): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!buffer) return reject(new Error('Buffer is empty'));
      
      const fileBase64 = buffer.toString('base64');
      this.imagekit.upload(
        {
          file: fileBase64,
          fileName: `pdf_${Date.now()}.pdf`,
          folder: "pdfs",
        },
        (error: any, result: any) => {
          if (error) return reject(error);
          resolve(result.url);
        }
      );
    });
  }

  async deleteImage(publicId: string): Promise<any> {
    return Promise.resolve({ result: 'ok' });
  }

  async destroy(publicId: string): Promise<any> {
    return Promise.resolve({ result: 'ok' });
  }
}