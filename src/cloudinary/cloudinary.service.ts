import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { UploadApiErrorResponse, UploadApiResponse, v2 } from "cloudinary";
import toStream = require("buffer-to-stream");
import * as streamifier from "streamifier";

@Injectable()
export class CloudinaryService {
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
  // async uploadPdfToCloudinary(fileBuffer: Buffer, fileName: string): Promise<string> {
  //   return new Promise((resolve, reject) => {
  //     // Convert the PDF buffer into a readable stream
  //     const stream = streamifier.createReadStream(fileBuffer);

  //     // Upload the buffer to Cloudinary as a PDF
  //     const uploadStream = v2.uploader.upload_stream(
  //       {
  //         public_id: `${fileName}`,  // The Cloudinary folder and file name
  //         resource_type: 'auto',          // Let Cloudinary auto-detect the file type (PDF in this case)
  //       },
  //       (error, result) => {
  //         if (error) {
  //           reject(`Failed to upload PDF: ${error.message}`);
  //         } else {
  //           resolve(result.secure_url);  // Return the secure URL of the uploaded file
  //         }
  //       }
  //     );

  //     // Pipe the buffer stream into Cloudinary's upload stream
  //     stream.pipe(uploadStream);
  //   });
  // }

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
