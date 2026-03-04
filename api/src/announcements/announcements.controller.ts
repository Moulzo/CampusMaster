import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AnnouncementsService } from "./announcements.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";

@ApiTags("announcements")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("announcements")
export class AnnouncementsController {
  constructor(private service: AnnouncementsService) {}

  // STUDENT + TEACHER + ADMIN : lire les annonces d'un cours
  @Get("course/:courseId")
  @Roles("STUDENT", "TEACHER", "ADMIN")
  list(@Param("courseId") courseId: string) {
    return this.service.listByCourse(courseId);
  }

  // TEACHER : créer une annonce pour un cours
  @Post("course/:courseId")
  @Roles("TEACHER", "ADMIN")
  create(@Param("courseId") courseId: string, @Req() req: any, @Body() dto: CreateAnnouncementDto) {
    return this.service.create(courseId, req.user.id, dto);
  }

  // TEACHER : modifier (seulement auteur) / ADMIN : modifier aussi si tu veux (option)
  @Put(":id")
  @Roles("TEACHER", "ADMIN")
  update(@Param("id") id: string, @Req() req: any, @Body() dto: UpdateAnnouncementDto) {
    // ici: TEACHER seulement auteur (en service). Admin passera aussi mais sera bloqué si pas auteur.
    // si tu veux autoriser admin à éditer: on peut adapter.
    return this.service.update(id, req.user.id, dto);
  }

  // TEACHER : supprimer (auteur) / ADMIN : supprimer tout
  @Delete(":id")
  @Roles("TEACHER", "ADMIN")
  remove(@Param("id") id: string, @Req() req: any) {
    const isAdmin = req.user?.role === "ADMIN";
    return this.service.remove(id, req.user.id, isAdmin);
  }
}
