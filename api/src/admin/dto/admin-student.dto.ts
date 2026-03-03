import { IsString, IsOptional } from "class-validator";

export class UpdateStudentModuleDto {
  @IsOptional()
  @IsString()
  learningModuleId?: string | null;
}
