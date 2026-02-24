import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LearningModulesService } from '../modules/modules.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateLearningModuleDto, UpdateLearningModuleDto } from '../modules/dto/learning-module.dto';

@ApiTags('admin-learning-modules')
@ApiBearerAuth('access-token')
@Controller('admin/learning-modules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminLearningModulesController {
  constructor(private readonly learningModulesService: LearningModulesService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @ApiQuery({ name: 'semesterId', required: false, type: String })
  findAll(@Query('semesterId') semesterId?: string) {
    return this.learningModulesService.findAll(semesterId);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  findOne(@Param('id') id: string) {
    return this.learningModulesService.findOne(id);
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  create(@Body() createLearningModuleDto: CreateLearningModuleDto) {
    return this.learningModulesService.create(createLearningModuleDto);
  }

  @Put(':id')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  update(
    @Param('id') id: string,
    @Body() updateLearningModuleDto: UpdateLearningModuleDto,
  ) {
    return this.learningModulesService.update(id, updateLearningModuleDto);
  }

  @Delete(':id')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  remove(@Param('id') id: string) {
    return this.learningModulesService.remove(id);
  }
}
