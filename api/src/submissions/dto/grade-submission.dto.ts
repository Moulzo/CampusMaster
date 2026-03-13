import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GradeSubmissionDto {
  @ApiProperty({ example: 16 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  score: number;

  @ApiPropertyOptional({ example: 'Bon travail. Attention aux questions 7 et 9.' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
