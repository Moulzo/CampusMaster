import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsString()
  @IsNotEmpty()
  assignmentId: string;

  @ApiPropertyOptional({ example: '/uploads/dm1_v1.pdf' })
  @IsOptional()
  @IsString()
  fileUrl?: string;
}
