import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('files')
@Controller('files')
export class FilesController {
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadsDir = join(process.cwd(), 'uploads');
          try {
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
          } catch {
            // ignore
          }
          cb(null, uploadsDir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname);
          const filename = `${unique}${ext}`;
          cb(null, filename);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(@UploadedFile() file?: any) {
    if (!file) {
      return { fileUrl: null };
    }

    const port = process.env.PORT ?? '3001';
    const fileUrl = `http://localhost:${port}/uploads/${file.filename}`;

    // Sauvegarder le mapping nom original -> nom de fichier
    const mappingPath = join(process.cwd(), 'uploads', 'filenames.json');
    let mappings = {};
    try {
      if (fs.existsSync(mappingPath)) {
        mappings = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
      }
    } catch {
      // Ignorer les erreurs
    }
    mappings[file.filename] = file.originalname;
    try {
      fs.writeFileSync(mappingPath, JSON.stringify(mappings, null, 2));
    } catch {
      // Ignorer les erreurs
    }

    return {
      fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }
}
