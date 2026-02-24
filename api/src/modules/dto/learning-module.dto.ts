import { IsString, IsOptional } from 'class-validator';

export class CreateLearningModuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  semesterId: string;
}

export class UpdateLearningModuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SetSubjectModuleDto {
  @IsString()
  learningModuleId: string;
}
