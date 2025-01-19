import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { UploadApiErrorResponse, UploadApiResponse, v2 } from "cloudinary";
import toStream = require("buffer-to-stream");
import * as streamifier from "streamifier";

@Injectable()
export class CloudinaryService {
  // async uploadImage(
  //   file: Express.Multer.File,
  // ): Promise<UploadApiResponse | UploadApiErrorResponse> {
  //   return new Promise((resolve, reject) => {
  //     try {
  //       const upload = v2.uploader.upload_stream((error, result) => {
  //         if (error) {
  //           // Handle the error, log it if necessary
  //           // console.error('Cloudinary upload error:', error);
  //           return reject(new InternalServerErrorException('Failed to upload image'));
  //         }
  //         resolve(result);
  //       });

  //       // Convert the file buffer into a readable stream and pipe it to Cloudinary
  //       toStream(file.buffer).pipe(upload);
  //     } catch (error) {
  //       // Handle any synchronous errors that might occur
  //       // console.error('Error during file upload:', error);
  //       reject(new InternalServerErrorException('Unexpected error occurred during upload'));
  //     }
  //   });
  // }
  async uploadToCloudinary(buffer: Buffer, fileName: string): Promise<string> {
    console.log("uploadToCloudinar", buffer, fileName);
    return new Promise((resolve, reject) => {
      const uploadStream = v2.uploader.upload_stream(
        {
          resource_type: "raw", // Treat file as raw binary
          public_id:`${fileName}.xlsx`,
          // folder: "excels", // Optional Cloudinary folder
          format: "xlsx",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary Upload Error:", error);
            reject(error);
          } else {
            resolve(result.secure_url); // Return Cloudinary file URL
          }
        }
      );
      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }
  async uploadImage(
    file: Express.Multer.File,
    folderName: string,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream(
        {
          folder: `${folderName}`, // Dynamic folder based on branch name
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      toStream(file.buffer).pipe(upload);
    });
  }

  // async uploadImage(
  //   file: Express.Multer.File,
  //   folderName: string,
  // ): Promise<UploadApiResponse | UploadApiErrorResponse> {
  //    const b64 = Buffer.from(file.buffer).toString('base64');
  //   const dataURI = 'data:' + file.mimetype + ';base64,' + b64;
  //   const res = await v2.uploader.upload(dataURI, { folder: folderName });
  //   return res;
  // }
}
