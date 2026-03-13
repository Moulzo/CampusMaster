import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'Mathématiques' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional({ example: 'Cours de mathématiques pour le semestre 1' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'module-123' })
  @IsOptional()
  @IsString()
  learningModuleId?: string; // ✅ optionnel pour permettre à l'admin d'organiser les matières
}
