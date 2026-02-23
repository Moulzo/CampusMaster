import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from "@nestjs/platform-socket.io";
import * as express from 'express';
import * as fs from 'fs';
import { join, basename } from 'path';

// Servir les fichiers statiques pour les uploads
function serveStaticFiles(app: NestExpressApplication) {
  const uploadsDir = join(process.cwd(), 'uploads');
  
  // Créer le middleware static personnalisé
  const staticMiddleware = express.static(uploadsDir);
  
  app.use('/uploads', (req, res, next) => {
    const filePath = join(uploadsDir, req.path.replace('/uploads', ''));
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    
    // Récupérer le nom original depuis le mapping
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
    
    // Servir le fichier avec le middleware static
    return staticMiddleware(req, res, next);
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useWebSocketAdapter(new IoAdapter(app));

  app.setGlobalPrefix('api');

  // Servir les fichiers statiques pour les uploads
  serveStaticFiles(app);

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
