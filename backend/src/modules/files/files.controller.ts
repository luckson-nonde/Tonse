import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Query,
  BadRequestException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Multer } from 'multer';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * Upload a single file
   * POST /files/upload?category=inquiries
   */
  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File, @Query('category') category: string = 'general') {
    console.log('Upload endpoint called. File:', file?.originalname, 'Category:', category);

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const fileUrl = this.filesService.uploadFile(file, category);

    const response = {
      success: true,
      url: fileUrl,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };

    console.log('Sending response:', response);
    return response;
  }

  /**
   * Upload multiple files
   * POST /files/upload-multiple?category=inquiries
   */
  @Post('upload-multiple')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('category') category: string = 'general'
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const urls = this.filesService.uploadMultipleFiles(files, category);

    return {
      success: true,
      urls,
      count: urls.length,
      files: files.map((f, idx) => ({
        filename: f.originalname,
        size: f.size,
        url: urls[idx],
      })),
    };
  }
}

