import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SemestersService } from './semesters.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { getUserId } from '../common/get-user-id';

@ApiTags('semesters')
@ApiBearerAuth('access-token')
@Controller('semesters')
@UseGuards(JwtAuthGuard)
export class SemestersController {
  constructor(private readonly semestersService: SemestersService) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  create(@Body() data: { name: string; startDate?: Date; endDate?: Date }) {
    return this.semestersService.create(data);
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  findAll() {
    return this.semestersService.findAll();
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  findOne(@Param('id') id: string) {
    return this.semestersService.findOne(id);
  }

  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  update(
    @Param('id') id: string,
    @Body() data: { name?: string; startDate?: Date; endDate?: Date },
  ) {
    return this.semestersService.update(id, data);
  }

  @Delete(':id')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  remove(@Param('id') id: string) {
    return this.semestersService.remove(id);
  }
}
