import { IsArray, IsOptional, IsString, ArrayUnique } from "class-validator";

export class CreateSubjectDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  learningModuleId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  teacherIds?: string[];
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  learningModuleId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  teacherIds?: string[];
}
