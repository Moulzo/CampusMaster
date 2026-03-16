# 🔧 FIXS & EXAMPLES - Backend Refactorisation

Snippets prêts à implémenter pour la refactorisation du backend.

---

## 1️⃣ FIX CRITIQUE: GradeSubmissionDto Validation

**Fichier:** `src/submissions/dto/grade-submission.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class GradeSubmissionDto {
  @ApiProperty({
    example: 18,
    description: 'Note attribuée (entre 0 et maxScore de l\'assignment)',
  })
  @IsNumber()
  @Min(0, { message: 'La note ne peut pas être négative' })
  @Max(1000, { message: 'La note ne peut pas dépasser 1000' })
  score: number;

  @ApiPropertyOptional({
    example: 'Excellent travail! Quelques points de détail...',
    description: 'Feedback optionnel pour l\'étudiant',
  })
  @IsOptional()
  @IsString()
  @Max(5000, { message: 'Le feedback ne peut pas dépasser 5000 caractères' })
  feedback?: string;
}
```

---

## 2️⃣ FIX CRITIQUE: File Upload - MIME Type Validation

**Fichier:** `src/files/files.controller.ts`

```typescript
import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Configuration des fichiers
const FILE_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIMES: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  ALLOWED_EXTENSIONS: ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx'],
};

function sanitizeFileName(originalName: string): string {
  // Limite la longueur et enlève les caractères problématiques
  return originalName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .slice(0, 200)
    .replace(/\.{2,}/g, '.'); // Prevent ../
}

function validateFileExtension(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return FILE_CONFIG.ALLOWED_EXTENSIONS.includes(ext);
}

@ApiTags('files')
@Controller('files')
export class FilesController {
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    schema: {
      properties: {
        fileUrl: { type: 'string', example: '/uploads/1234567890-xxx.pdf' },
        originalName: { type: 'string' },
        size: { type: 'number' },
      },
    },
  })
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
          // ✅ Validate extension FIRST
          if (!validateFileExtension(file.originalname)) {
            return cb(
              new BadRequestException(
                `Invalid file extension. Allowed: ${FILE_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`,
              ),
            );
          }

          // ✅ Sanitize filename
          const sanitized = sanitizeFileName(file.originalname);
          const ext = extname(sanitized);
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const filename = `${unique}${ext}`;
          cb(null, filename);
        },
      }),
      limits: { fileSize: FILE_CONFIG.MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        // ✅ Double-check MIME type
        if (!FILE_CONFIG.ALLOWED_MIMES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `Invalid MIME type: ${file.mimetype}. Allowed: ${FILE_CONFIG.ALLOWED_MIMES.join(', ')}`,
            ),
          );
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file?: any) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const fileUrl = `/uploads/${file.filename}`;

    // Sauvegarder le mapping
    const mappingPath = join(process.cwd(), 'uploads', 'filenames.json');
    let mappings = {};
    try {
      if (fs.existsSync(mappingPath)) {
        mappings = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
      }
    } catch {
      // ignore
    }
    mappings[file.filename] = file.originalname;
    try {
      fs.writeFileSync(mappingPath, JSON.stringify(mappings, null, 2));
    } catch {
      // ignore
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
```

---

## 3️⃣ FIX CRITIQUE: Path Traversal Protection

**Fichier:** `src/main.ts` (fonction serveStaticFiles)

```typescript
import * as path from 'path';
import { promises as fs } from 'fs';

// ✅ Remplacer la fonction serveStaticFiles par:
async function serveStaticFiles(app: NestExpressApplication) {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');

  app.use('/uploads', async (req, res, next) => {
    try {
      // ✅ Valider et résoudre le chemin
      const requestPath = decodeURIComponent(req.path.replace('/uploads', ''));

      // ✅ Block path traversal attempts
      if (requestPath.includes('..') || requestPath.includes('\\')) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const filePath = path.resolve(uploadsDir, requestPath);

      // ✅ Vérifier que le fichier résolvé reste dans uploads/
      if (!filePath.startsWith(uploadsDir)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // ✅ Vérifier l'existence du fichier
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return res.status(404).json({ error: 'Not Found' });
      }

      // ✅ Récupérer le nom original
      const filename = path.basename(filePath);
      const mappingPath = path.join(uploadsDir, 'filenames.json');
      try {
        const data = await fs.readFile(mappingPath, 'utf-8');
        const mappings = JSON.parse(data);
        const originalName = mappings[filename];
        if (originalName) {
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(originalName)}"`,
          );
        }
      } catch {
        // ignore mapping errors
      }

      // ✅ Servir le fichier proprement
      return res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  });
}
```

---

## 4️⃣ CRÉER: CurrentUser Decorator

**Nouveau fichier:** `src/common/decorators/current-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export interface CurrentUserData {
  id: string;
  email: string;
  fullName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserData | undefined;

    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    if (data) {
      // Allow extracting specific fields: @CurrentUser('id')
      return user[data];
    }

    return user;
  },
);
```

**Utilisation:**
```typescript
// Au lieu de:
const userId = req.user.id ?? req.user.sub;

// Faire:
@Get()
async get(@CurrentUser() user: CurrentUserData) {
  return this.service.findAll(user.id);
}

// Ou spécifiquement:
@Get()
async get(@CurrentUser('id') userId: string) {
  return this.service.findAll(userId);
}
```

---

## 5️⃣ CRÉER: AccessControlService

**Nouveau fichier:** `src/common/services/access-control.service.ts`

```typescript
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Service centralisé pour la vérification d'accès et permissions
 * Évite la duplication dans assignments / submissions / courses
 */
@Injectable()
export class AccessControlService {
  constructor(private prisma: PrismaService) {}

  /**
   * Vérifie qu'un étudiant peut accéder un cours via son module d'apprentissage
   */
  async assertStudentCanAccessCourse(
    studentId: string,
    courseId: string,
  ): Promise<void> {
    const [student, course] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: studentId },
        select: { learningModuleId: true, role: true },
      }),
      this.prisma.course.findUnique({
        where: { id: courseId },
        select: { learningModuleId: true },
      }),
    ]);

    if (!student) throw new NotFoundException('Student not found');
    if (student.role !== 'STUDENT') {
      throw new ForbiddenException('User is not a student');
    }

    if (!course) throw new NotFoundException('Course not found');

    if (!student.learningModuleId || !course.learningModuleId) {
      throw new ForbiddenException(
        'No learning module assigned to student or course',
      );
    }

    if (student.learningModuleId !== course.learningModuleId) {
      throw new ForbiddenException(
        'Student is not enrolled in this course (module mismatch)',
      );
    }
  }

  /**
   * Vérifie qu'un prof enseigne un cours
   */
  async assertTeacherCanAccessCourse(
    teacherId: string,
    courseId: string,
  ): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { teachers: { select: { id: true } } },
    });

    if (!course) throw new NotFoundException('Course not found');

    const isTeacher = course.teachers.some((t) => t.id === teacherId);
    if (!isTeacher) {
      throw new ForbiddenException('You are not a teacher of this course');
    }
  }

  /**
   * Vérifie qu'un prof est bien le prof qui a créé une remise
   */
  async assertTeacherCanGradeSubmission(
    teacherId: string,
    submissionId: string,
  ): Promise<void> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: { include: { course: { include: { teachers: true } } } } },
    });

    if (!submission) throw new NotFoundException('Submission not found');

    await this.assertTeacherCanAccessCourse(teacherId, submission.assignment.courseId);
  }
}
```

**Utilisation:**
```typescript
// Dans submissions.service.ts:
constructor(private accessControl: AccessControlService) {}

async create(assignmentId: string, studentId: string) {
  // Au lieu de répéter la logique:
  await this.accessControl.assertStudentCanAccessCourse(studentId, courseId);
  // ...
}
```

---

## 6️⃣ FIX: Transactions Prisma

**Fichier:** `src/assignments/assignments.service.ts`

```typescript
async create(createAssignmentDto: CreateAssignmentDto, teacherId: string) {
  return this.prisma.$transaction(async (tx) => {
    // ✅ Tout dans une transaction - soit tout succède, soit rien
    const course = await tx.course.findUnique({
      where: { id: createAssignmentDto.courseId },
      include: { teachers: { select: { id: true } } },
    });

    if (!course) throw new NotFoundException('Course not found');

    const isTeacher = course.teachers.some((t) => t.id === teacherId);
    if (!isTeacher) {
      throw new ForbiddenException('You are not teacher of this course');
    }

    const maxScore = createAssignmentDto.maxScore ?? 20;
    if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 1000) {
      throw new BadRequestException(
        'maxScore must be between 1 and 1000',
      );
    }

    const assignment = await tx.assignment.create({
      data: {
        title: createAssignmentDto.title,
        description: createAssignmentDto.description ?? null,
        dueDate: new Date(createAssignmentDto.dueDate),
        maxScore,
        courseId: createAssignmentDto.courseId,
        teacherId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            learningModuleId: true,
          },
        },
        submissions: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    // ✅ Créer les notifications DANS la transaction
    const students = assignment.course.learningModuleId
      ? await tx.user.findMany({
          where: {
            learningModuleId: assignment.course.learningModuleId,
            role: 'STUDENT',
          },
          select: { id: true },
        })
      : [];

    for (const student of students) {
      await tx.notification.create({
        data: {
          userId: student.id,
          title: `Nouvelle activité: ${assignment.title}`,
          message: `Un nouveau devoir a été créé dans ${assignment.course.title}`,
          type: 'NEW_ASSIGNMENT',
          metadata: {
            courseId: assignment.courseId,
            assignmentId: assignment.id,
          },
        },
      });
    }

    return assignment;
  });
}
```

---

## 7️⃣ FIX: WebSocket CORS Env Vars

**Fichier:** `src/websockets/notifications.gateway.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

@WebSocketGateway({
  cors: {
    origin: getAllowedOrigins(),  // ✅ Fonction helper
    credentials: true,
  },
})
export class NotificationsGateway {
  constructor(private configService: ConfigService) {}
  // ...
}

// ✅ Helper function
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.WEBSOCKET_ORIGINS;

  if (envOrigins) {
    return envOrigins.split(',').map((o) => o.trim());
  }

  // Fallback for dev
  return [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL,
  ].filter(Boolean);
}
```

**.env:**
```
WEBSOCKET_ORIGINS=http://localhost:3000,https://campusmaster.example.com
```

---

## 8️⃣ FIX: Logger centralisé - Retirer console.log

**Fichier:** `src/announcements/announcements.service.ts`

```typescript
// ❌ AVANT:
console.log("ANNOUNCE fallback: no direct students...");
console.log("ANNOUNCE fallback: found module students", studentIds);

// ✅ APRÈS:
import { Logger, Injectable } from '@nestjs/common';

@Injectable()
export class AnnouncementsService {
  private logger = new Logger(AnnouncementsService.name);

  async create(courseId: string, authorId: string, title: string, content: string) {
    this.logger.debug(`Creating announcement for course: ${courseId}`);

    try {
      // Fallback logic
      this.logger.debug('No direct students found, checking module students...');
      const studentIds = await this.getModuleStudents(courseId);
      this.logger.debug(`Found ${studentIds.length} module students`);
    } catch (error) {
      this.logger.error('Failed to fetch module students', error);
      throw error;
    }
  }
}
```

---

## 9️⃣ FIX: Constants File

**Nouveau fichier:** `src/common/constants/app.constants.ts`

```typescript
export const ASSIGNMENT_CONFIG = {
  DEFAULT_MAX_SCORE: 20,
  MIN_SCORE: 0,
  MAX_SCORE: 1000,
  DECIMAL_PLACES: 2,
};

export const FILE_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  UPLOAD_DIR: 'uploads',
  ALLOWED_EXTENSIONS: ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp'],
  ALLOWED_MIMES: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
  ],
};

export const PASSWORD_CONFIG = {
  MIN_LENGTH: 8,
  RESET_TOKEN_EXPIRY_MS: 1 * 60 * 60 * 1000, // 1 hour
};

export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
};

export const PAGINATION = {
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
};
```

**Utilisation:**
```typescript
import { ASSIGNMENT_CONFIG } from '../constants/app.constants';

const maxScore = dto.maxScore ?? ASSIGNMENT_CONFIG.DEFAULT_MAX_SCORE;
if (maxScore > ASSIGNMENT_CONFIG.MAX_SCORE) {
  throw new BadRequestException('...');
}
```

---

## 🔟 FIX: Type Safety - JWT Payload

**Fichier:** `src/auth/jwt.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// ✅ Typer correctement le payload
interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  iat: number;
  exp: number;
}

export interface ValidatedUser {
  id: string;
  email: string;
  fullName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret',
      ignoreExpiration: false,
    });
  }

  async validate(payload: any): Promise<ValidatedUser> {
    // ✅ Valider la structure du payload
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid token structure');
    }

    // ✅ Valider le rôle
    const validRoles = ['STUDENT', 'TEACHER', 'ADMIN'];
    if (!validRoles.includes(payload.role)) {
      throw new UnauthorizedException('Invalid role in token');
    }

    return {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role as ValidatedUser['role'],
    };
  }
}
```

---

## 1️⃣1️⃣ FIX: Pagination Helper

**Nouveau fichier:** `src/common/utils/pagination.util.ts`

```typescript
import { BadRequestException } from '@nestjs/common';
import { PAGINATION } from '../constants/app.constants';

export interface PaginationParams {
  page?: string;
  limit?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function parsePaginationParams(params: PaginationParams) {
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    parseInt(params.limit || PAGINATION.DEFAULT_LIMIT.toString(), 10),
  );

  if (isNaN(page) || isNaN(limit) || limit <= 0) {
    throw new BadRequestException('Invalid pagination parameters');
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

**Utilisation:**
```typescript
@Get()
async findAll(
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  const { skip, page: p, limit: l } = parsePaginationParams({ page, limit });

  const [data, total] = await Promise.all([
    this.service.findAll(skip, l),
    this.service.count(),
  ]);

  return createPaginatedResponse(data, total, p, l);
}
```

---

## Priorité d'implémentation:

```
SEMAINE 1:
1. GradeSubmissionDto validation ✅ (1h)
2. File MIME validation ✅ (2h)
3. Path traversal fix ✅ (2h)
4. Retirer console.log ✅ (1h)
5. CurrentUser decorator ✅ (2h)

SEMAINE 2:
6. AccessControlService ✅ (3h)
7. Transactions Prisma ✅ (2h)
8. WebSocket CORS fix ✅ (1h)
9. Constants file ✅ (1h)
10. JWT type safety ✅ (1h)

SEMAINE 3:
11. Pagination implementation (4h)
12. Tests unitaires (8h)
13. Response DTOs (4h)
```

---

**Consultez le fichier principal AUDIT_BACKEND_NESTJS.md pour le contexte complet**
