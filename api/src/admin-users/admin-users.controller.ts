import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminUsersService } from './admin-users.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private adminUsers: AdminUsersService) {}

  @Get()
  list() {
    return this.adminUsers.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.adminUsers.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.adminUsers.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const currentUserId = req.user?.id ?? req.user?.sub;
    if (currentUserId && currentUserId === id) {
      throw new BadRequestException('You cannot delete your own account');
    }
    return this.adminUsers.remove(id);
  }
}
