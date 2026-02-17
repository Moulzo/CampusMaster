import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GradeSubmissionDto {
  @ApiProperty({ example: 16 })
  score: number;

  @ApiPropertyOptional({ example: 'Bon travail. Attention aux questions 7 et 9.' })
  feedback?: string;
}
