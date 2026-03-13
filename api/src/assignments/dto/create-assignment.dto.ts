import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  dueDate: string; // ISO string

  @IsNumber()
  @IsOptional()
  maxScore?: number;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsString()
  @IsOptional()
  attachmentName?: string;

  @IsNumber()
  @IsOptional()
  attachmentSize?: number;

  @IsString()
  @IsOptional()
  attachmentMimeType?: string;

  @IsString()
  @IsNotEmpty()
  courseId: string;
}
