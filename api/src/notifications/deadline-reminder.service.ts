import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class DeadlineReminderService {
  private readonly logger = new Logger(DeadlineReminderService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron('0 */6 * * *') // Toutes les 6 heures
  async checkDeadlines() {
    this.logger.log('[DeadlineReminder] Vérification des deadlines...');
    
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    try {
      // Récupérer les devoirs à échéance proche (< 48h)
      const upcomingAssignments = await this.prisma.assignment.findMany({
        where: {
          dueDate: {
            lte: in48Hours,
            gt: now,
          },
        },
        include: {
          course: {
            include: {
              students: {
                select: { id: true, email: true, fullName: true },
              },
            },
          },
          submissions: {
            select: { studentId: true },
          },
        },
      });

      this.logger.log(`[DeadlineReminder] ${upcomingAssignments.length} devoirs à échéance proche`);

      for (const assignment of upcomingAssignments) {
        const hoursLeft = Math.max(0, (new Date(assignment.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60));
        
        // Notifier uniquement les étudiants qui n'ont pas soumis
        const submittedStudentIds = assignment.submissions.map(s => s.studentId);
        const studentsToNotify = assignment.course.students.filter(
          student => !submittedStudentIds.includes(student.id)
        );

        for (const student of studentsToNotify) {
          // Notification si deadline < 24h
          if (hoursLeft <= 24) {
            await this.notificationsService.notifyDeadlineReminder(
              student.id,
              assignment.title,
              assignment.course.title,
              Math.ceil(hoursLeft)
            );
            this.logger.log(`[DeadlineReminder] Notif envoyée à ${student.email} - deadline ${hoursLeft.toFixed(1)}h`);
          }
        }
      }
    } catch (error) {
      this.logger.error('[DeadlineReminder] Erreur lors de la vérification:', error);
    }
  }
}
