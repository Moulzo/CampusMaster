import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, basename } from 'path';
import * as express from 'express';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  // Servir les fichiers statiques avec Content-Disposition pour le nom original
  const uploadsDir = join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res, filePath) => {
      // Essayer de récupérer le nom original depuis un mapping si disponible
      const filename = basename(filePath);
      const mappingPath = join(uploadsDir, 'filenames.json');
      try {
        if (fs.existsSync(mappingPath)) {
          const mappings = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
          const originalName = mappings[filename];
          if (originalName) {
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
          }
        }
      } catch {
        // Ignorer les erreurs
      }
    }
  }));

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('CampusMaster API')
    .setDescription('API du projet CampusMaster')
    .setVersion('0.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
