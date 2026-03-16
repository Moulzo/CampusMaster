import { IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubmissionFileDto {
  @ApiProperty({ example: 'submission-123' })
  @IsString()
  @IsNotEmpty()
  submissionId: string;

  @ApiProperty({ example: 'mon_devoir.pdf' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ example: '/uploads/submissions/mon_devoir.pdf' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiProperty({ example: 1024000 })
  @IsNumber()
  @IsNotEmpty()
  fileSize: number;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;
}
