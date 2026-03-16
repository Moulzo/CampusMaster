import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as express from 'express';
import * as fs from 'fs';
import { join, basename, normalize, sep } from 'path';

// Servir les fichiers statiques pour les uploads
function serveStaticFiles(app: NestExpressApplication) {
  const uploadsDir = join(process.cwd(), 'uploads');
  const staticMiddleware = express.static(uploadsDir);

  app.use('/uploads', (req, res, next) => {
    const relativePath = normalize(req.path).replace(/^([/\\])+/, '');
    const normalizedUploadsDir = normalize(uploadsDir + sep);
    const normalizedFilePath = normalize(join(uploadsDir, relativePath));

    if (!normalizedFilePath.startsWith(normalizedUploadsDir)) {
      return res.status(403).send('Forbidden');
    }

    if (!fs.existsSync(normalizedFilePath)) {
      return res.status(404).send('File not found');
    }

    const filename = basename(normalizedFilePath);
    const mappingPath = join(uploadsDir, 'filenames.json');

    try {
      if (fs.existsSync(mappingPath)) {
        const mappings = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
        const originalName = mappings[filename];
        if (originalName) {
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(originalName)}"`,
          );
        }
      }
    } catch {
      // Ignorer les erreurs de mapping
    }

    return staticMiddleware(req, res, next);
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useWebSocketAdapter(new IoAdapter(app));

  app.setGlobalPrefix('api');

  // Validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // supprime les champs non déclarés dans les DTOs
      forbidNonWhitelisted: false,
    }),
  );

  serveStaticFiles(app);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  // ✅ Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('CampusMaster API')
    .setDescription(
      `API REST de la plateforme pédagogique CampusMaster.\n\n` +
      `**Rate limiting** : 20 req/s · 100 req/10s · 500 req/min par IP.\n\n` +
      `Les routes d'authentification (\`/auth/login\`, \`/auth/register\`) ont une limite renforcée via \`@Throttle\`.`,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Entrez votre access token JWT',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // conserve le token entre les rechargements
    },
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();