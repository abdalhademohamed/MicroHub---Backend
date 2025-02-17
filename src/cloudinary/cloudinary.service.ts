import { Injectable } from "@nestjs/common";
import { UploadApiErrorResponse, UploadApiResponse, v2 } from "cloudinary";
import toStream = require("buffer-to-stream");
import * as streamifier from "streamifier";
import { v4 } from "uuid";

@Injectable()
export class CloudinaryService {
  async uploadToCloudinary(buffer: Buffer): Promise<string> {
    console.log("uploadToCloudinar", buffer);
    return new Promise((resolve, reject) => {
      const uploadStream = v2.uploader.upload_stream(
        {
          resource_type: "raw", // Treat file as raw binary
          // public_id:`${fileName}.xlsx`,
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
        },
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
  async uploadPdfToCloudinary(buffer: any): Promise<string> {
    return new Promise((resolve, reject) => {
      v2.uploader
        .upload_stream(
          { resource_type: "raw", format: "pdf", type: "upload" }, // Specify raw for non-image files
          (error, result) => {
            if (error) {
              console.error("Error uploading to Cloudinary:", error);
              return reject(error);
            }
            resolve(result.secure_url); // The URL of the uploaded PDF
          },
        )
        .end(buffer); // Pass the buffer here
    });
  }
}
