import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SemestersService } from '../semesters/semesters.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateSemesterDto, UpdateSemesterDto } from '../semesters/dto/semester.dto';

@ApiTags('admin-semesters')
@ApiBearerAuth('access-token')
@Controller('admin/semesters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSemestersController {
  constructor(private readonly semestersService: SemestersService) {}

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

  @Post()
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  create(@Body() createSemesterDto: CreateSemesterDto) {
    return this.semestersService.create({
      name: createSemesterDto.name,
      startDate: createSemesterDto.startDate ? new Date(createSemesterDto.startDate) : undefined,
      endDate: createSemesterDto.endDate ? new Date(createSemesterDto.endDate) : undefined,
    });
  }

  @Put(':id')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  update(
    @Param('id') id: string,
    @Body() updateSemesterDto: UpdateSemesterDto,
  ) {
    return this.semestersService.update(id, {
      name: updateSemesterDto.name,
      startDate: updateSemesterDto.startDate ? new Date(updateSemesterDto.startDate) : undefined,
      endDate: updateSemesterDto.endDate ? new Date(updateSemesterDto.endDate) : undefined,
    });
  }

  @Delete(':id')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  remove(@Param('id') id: string) {
    return this.semestersService.remove(id);
  }
}
