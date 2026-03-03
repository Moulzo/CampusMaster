import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Header,
  ForbiddenException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import * as fs from "fs";
import * as path from "path";
import type { Response } from "express";
import type { Express } from "express";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CourseResourcesService } from "./course-resources.service";
import { CreateCourseResourceDto } from "./dto/create-course-resource.dto";

function ensureDirSync(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeFileName(originalName: string) {
  // garde une extension propre, enlève caractères relous
  const base = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return base;
}

@ApiTags("course-resources")
@ApiBearerAuth("access-token")
@Controller("courses")
export class CourseResourcesController {
  constructor(private readonly service: CourseResourcesService) {}

  // LIST resources of a course (teacher of course OR enrolled student OR admin)
  @Get(":courseId/resources")
  @UseGuards(JwtAuthGuard)
  @Header("Cache-Control", "no-store")
  list(@Param("courseId") courseId: string, @Request() req: any) {
    const userId = req.user.id ?? req.user.sub;
    const role = req.user.role;
    return this.service.listCourseResources(courseId, userId, role);
  }

  // UPLOAD (teacher only, and must be teacher of this course)
  @Post(":courseId/resources")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const courseId = req.params.courseId as string;
          const dest = path.join(process.cwd(), "uploads", "courses", courseId);
          ensureDirSync(dest);
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          const courseId = req.params.courseId;
          const clean = safeFileName(file.originalname);
          const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(clean)}`;
          cb(null, unique);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB (ajuste)
      },
      fileFilter: (req, file, cb) => {
        // autorise pdf, ppt/pptx, doc/docx, images, mp4 (ajuste si besoin)
        const ok =
          file.mimetype === "application/pdf" ||
          file.mimetype === "application/vnd.ms-powerpoint" ||
          file.mimetype ===
            "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
          file.mimetype === "application/msword" ||
          file.mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.mimetype.startsWith("image/") ||
          file.mimetype === "video/mp4";

        if (!ok) return cb(new BadRequestException("Type de fichier non autorisé."), false);
        cb(null, true);
      },
    })
  )
  async upload(
    @Param("courseId") courseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateCourseResourceDto,
    @Request() req: any
  ) {
    if (!file) throw new BadRequestException("Fichier manquant.");
    const teacherId = req.user.id ?? req.user.sub;
    if (typeof teacherId !== "string") {
      throw new BadRequestException("Invalid teacher ID");
    }
    return this.service.createResource(courseId, teacherId, dto, file);
  }

  // DOWNLOAD a resource (teacher of course OR enrolled student OR admin)
  @Get("resources/:id/download")
  @UseGuards(JwtAuthGuard)
  async download(@Param("id") id: string, @Request() req: any, @Res({ passthrough: true }) res: Response) {
    const userId = req.user.id ?? req.user.sub;
    const role = req.user.role;

    const resource = await this.service.getResourceForDownload(id, userId, role);

    const absPath = path.join(process.cwd(), "uploads", resource.path);
    if (!fs.existsSync(absPath)) {
      throw new BadRequestException("Fichier introuvable sur le serveur.");
    }

    res.setHeader("Content-Type", resource.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${resource.filename}"`);
    
    // Utiliser createReadStream pour envoyer le fichier
    const fileStream = fs.createReadStream(absPath);
    return new Promise((resolve, reject) => {
      fileStream.pipe(res);
      fileStream.on('end', () => resolve(null));
      fileStream.on('error', (err) => reject(err));
    });
  }

  // DELETE (teacher owner only OR admin)
  @Delete("resources/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("TEACHER", "ADMIN")
  async remove(@Param("id") id: string, @Request() req: any) {
    const userId = req.user.id ?? req.user.sub;
    const role = req.user.role;
    return this.service.deleteResource(id, userId, role);
  }
}
