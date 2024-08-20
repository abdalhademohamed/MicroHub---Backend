import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 } from 'cloudinary';
import toStream = require('buffer-to-stream');
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

  async uploadImage(
    file: Express.Multer.File,
    folderName: string,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream(
        {
          folder: `${folderName}`,  // Dynamic folder based on branch name
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
  
      toStream(file.buffer).pipe(upload);
    });
  }
  
}