import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DiscussionsController } from "./discussions.controller";
import { DiscussionsService } from "./discussions.service";

@Module({
  controllers: [DiscussionsController],
  providers: [DiscussionsService, PrismaService],
})
export class DiscussionsModule {}
