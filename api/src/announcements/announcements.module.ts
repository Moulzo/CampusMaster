import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AnnouncementsController } from "./announcements.controller";
import { AnnouncementsService } from "./announcements.service";
import { WebSocketsModule } from "../websockets/websockets.module";

@Module({
  imports: [PrismaModule, WebSocketsModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
