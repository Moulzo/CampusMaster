import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('tickets')
  create(@Request() req: any, @Body() dto: CreateTicketDto) {
    const userId = req.user?.id ?? req.user?.sub;
    const role = req.user?.role;
    return this.ticketsService.create(userId, role, dto);
  }

  @Get('tickets/my')
  findMine(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.ticketsService.findMine(userId);
  }

  @Get('admin/tickets')
  @Roles('ADMIN')
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  })
  findAll(@Query('status') status?: TicketStatus) {
    return this.ticketsService.findAll(status ? { status } : undefined);
  }

  @Patch('admin/tickets/:id/status')
  @Roles('ADMIN')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.ticketsService.updateStatus(id, dto.status);
  }
}
