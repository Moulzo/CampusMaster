import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubmissionDto {
  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxxxxxxxxx' })
  assignmentId: string;

  @ApiPropertyOptional({ example: '/uploads/dm1_v1.pdf' })
  fileUrl?: string;
}
