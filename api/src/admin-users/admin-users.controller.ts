import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminUsersService } from './admin-users.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AdminCreateUserDto } from '../admin/dto/admin-create-user.dto';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private adminUsers: AdminUsersService) {}

  @Get()
@ApiQuery({ name: 'role', required: false, enum: ['ADMIN', 'TEACHER', 'STUDENT'] })
async findAll(@Query('role') role?: 'ADMIN' | 'TEACHER' | 'STUDENT') {
  return this.adminUsers.findAll({ role });
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

  @Post()
  create(@Body() dto: AdminCreateUserDto) {
    return this.adminUsers.create(dto);
  }
}
