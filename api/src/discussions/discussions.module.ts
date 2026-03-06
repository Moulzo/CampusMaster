import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DiscussionsController } from "./discussions.controller";
import { DiscussionsService } from "./discussions.service";
import { WebSocketsModule } from "../websockets/websockets.module";

@Module({
  imports: [WebSocketsModule],
  controllers: [DiscussionsController],
  providers: [DiscussionsService, PrismaService],
})
export class DiscussionsModule {}
