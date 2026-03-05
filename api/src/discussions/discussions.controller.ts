import { Body, BadRequestException, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { DiscussionsService } from "./discussions.service";
import { CreateThreadDto } from "./dto/create-thread.dto";
import { CreateMessageDto } from "./dto/create-message.dto";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiscussionsController {
  constructor(private discussions: DiscussionsService) {}

  @Get("courses/:courseId/discussions")
  listThreads(@Param("courseId") courseId: string, @Req() req: any) {
    return this.discussions.listThreads(courseId, req.user);
  }

  @Post("courses/:courseId/discussions")
  createThread(@Param("courseId") courseId: string, @Req() req: any, @Body() dto: CreateThreadDto) {
    if (!dto?.title) throw new BadRequestException("title is required");
    return this.discussions.createThread(courseId, req.user, dto.title);
  }

  @Get("discussions/:threadId/messages")
  listMessages(@Param("threadId") threadId: string, @Req() req: any) {
    return this.discussions.listMessages(threadId, req.user);
  }

  @Post("discussions/:threadId/messages")
  createMessage(@Param("threadId") threadId: string, @Req() req: any, @Body() dto: CreateMessageDto) {
    if (!dto?.content) throw new BadRequestException("content is required");
    return this.discussions.createMessage(threadId, req.user, dto.content);
  }

  @Delete("discussions/:threadId")
  deleteThread(@Param("threadId") threadId: string, @Req() req: any) {
    return this.discussions.deleteThread(threadId, req.user);
  }
}
